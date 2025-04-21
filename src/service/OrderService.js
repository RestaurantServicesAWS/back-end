import logger from "../logger/winstonLogging.js";
import { createError } from "../errors/errors.js";

class OrderService {
  #pool;

  constructor(postgresConnection, restaurantService, paymentsService) {
    this.postgresConnection = postgresConnection;
    this.restaurantService = restaurantService;
    this.paymentsService = paymentsService;
  }

  async init() {
    this.#pool = await this.postgresConnection.getPool();
  }

  // Создание нового заказа
  async createOrder(clientId, data) {
    await this.init();
    const client = await this.#pool.query('SELECT * FROM accounts WHERE id = $1', [clientId]);
    if (!client.rows[0]) throw new createError(404, "Client not found");
    try {
      logger.info("Creating new order", { clientId, data });
      const { restaurant_id, items, description } = data; // items: [{ menu_id, quantity }]

      // Проверка, что restaurant_id существует
      await this.restaurantService.getById(restaurant_id);

      // Проверка, что все menu_id существуют и принадлежат ресторану
      const menuItems = await this.restaurantService.getMenu(restaurant_id);
      const validItemIds = menuItems.map((item) => item.id);
      const invalidItems = items.filter((item) => !validItemIds.includes(item.menu_id));
      if (invalidItems.length > 0) {
        throw new createError(400, `Invalid dish IDs: ${invalidItems.map((i) => i.menu_id).join(", ")}`);
      }

      // Расчет общей стоимости
      const total_cost = items
        .reduce((sum, item) => {
          const menuItem = menuItems.find((m) => m.id === item.menu_id);
          return sum + parseFloat(menuItem.price) * item.quantity;
        }, 0)
        .toFixed(2);

      // Начало транзакции
      const client = await this.#pool.connect();
      try {
        await client.query("BEGIN");

        // Создание заказа
        const orderQuery = `
          INSERT INTO orders (client_id, restaurant_id, order_time, total_cost, status, description)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *;
        `;
        const orderValues = [
          clientId,
          restaurant_id,
          new Date(),
          total_cost,
          "pending",
          description || null,
        ];
        const orderResult = await client.query(orderQuery, orderValues);
        const order = orderResult.rows[0];

        // Добавление позиций в order_items
        const itemQuery = `
          INSERT INTO order_items (order_id, menu_id, quantity, price)
          VALUES ${items.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(", ")}
          RETURNING *;
        `;
        const itemValues = items.flatMap((item) => {
          const menuItem = menuItems.find((m) => m.id === item.menu_id);
          return [order.id, item.menu_id, item.quantity, parseFloat(menuItem.price)];
        });
        const itemResult = await client.query(itemQuery, itemValues);

        // Создание платежа
        const paymentStatus = await this.paymentsService.createPayment(clientId, {
          orderId: order.id,
        });
        if (paymentStatus !== "PAID") {
          throw new createError(400, "Payment failed");
        }

        await client.query("COMMIT");
        order.items = itemResult.rows;
        logger.info("Order created", { orderId: order.id });
        return order;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error("Create order error", { error });
      throw error;
    }
  }

  // Получение заказа по ID
  async getOrderById(orderId) {
    await this.init();
    try {
      logger.info("Fetching order by ID", { orderId });
      const query = `
        SELECT o.*, 
               oi.id AS item_id, oi.menu_id, oi.quantity, oi.price,
               d.name AS dish_name, d.description AS dish_description
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN dishes d ON oi.menu_id = d.id
        WHERE o.id = $1;
      `;
      const result = await this.#pool.query(query, [orderId]);
      if (result.rowCount === 0) {
        throw new createError(404, "Order not found");
      }

      // Формирование ответа
      const order = result.rows[0];
      order.items = result.rows
        .filter((row) => row.item_id)
        .map((row) => ({
          id: row.item_id,
          menu_id: row.menu_id,
          quantity: row.quantity,
          price: row.price,
          name: row.dish_name,
          description: row.dish_description,
        }));

      logger.debug("Order fetched", { orderId });
      return order;
    } catch (error) {
      logger.error("Get order error", { error });
      throw error;
    }
  }

  // Получение заказов клиента
  async getClientOrders(clientId) {
    await this.init();
    try {
      logger.info("Fetching orders for client", { clientId });
      const query = `
        SELECT o.*, 
               oi.id AS item_id, oi.menu_id, oi.quantity, oi.price,
               d.name AS dish_name, d.description AS dish_description
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN dishes d ON oi.menu_id = d.id
        WHERE o.client_id = $1
        ORDER BY o.order_time DESC;
      `;
      const result = await this.#pool.query(query, [clientId]);

      // Группировка заказов
      const orders = [];
      const orderMap = new Map();
      result.rows.forEach((row) => {
        if (!orderMap.has(row.id)) {
          orderMap.set(row.id, {
            ...row,
            items: [],
          });
        }
        if (row.item_id) {
          orderMap.get(row.id).items.push({
            id: row.item_id,
            menu_id: row.menu_id,
            quantity: row.quantity,
            price: row.price,
            name: row.dish_name,
            description: row.dish_description,
          });
        }
      });
      orderMap.forEach((value) => orders.push(value));

      logger.debug("Client orders fetched", { count: orders.length });
      return orders;
    } catch (error) {
      logger.error("Get client orders error", { error });
      throw error;
    }
  }

  // Получение заказов ресторана
  async getRestaurantOrders(restaurantId) {
    await this.init();
    try {
      logger.info("Fetching orders for restaurant", { restaurantId });
      const query = `
        SELECT o.*, 
               oi.id AS item_id, oi.menu_id, oi.quantity, oi.price,
               d.name AS dish_name, d.description AS dish_description
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN dishes d ON oi.menu_id = d.id
        WHERE o.restaurant_id = $1
        ORDER BY o.order_time DESC;
      `;
      const result = await this.#pool.query(query, [restaurantId]);

      // Группировка заказов
      const orders = [];
      const orderMap = new Map();
      result.rows.forEach((row) => {
        if (!orderMap.has(row.id)) {
          orderMap.set(row.id, {
            ...row,
            items: [],
          });
        }
        if (row.item_id) {
          orderMap.get(row.id).items.push({
            id: row.item_id,
            menu_id: row.menu_id,
            quantity: row.quantity,
            price: row.price,
            name: row.dish_name,
            description: row.dish_description,
          });
        }
      });
      orderMap.forEach((value) => orders.push(value));

      logger.debug("Restaurant orders fetched", { count: orders.length });
      return orders;
    } catch (error) {
      logger.error("Get restaurant orders error", { error });
      throw error;
    }
  }

  // Получение заказов курьера
  async getCourierOrders(courierId) {
    await this.init();
    try {
      logger.info("Fetching orders for courier", { courierId });
      const query = `
        SELECT o.*, 
               oi.id AS item_id, oi.menu_id, oi.quantity, oi.price,
               d.name AS dish_name, d.description AS dish_description
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN dishes d ON oi.menu_id = d.id
        WHERE o.courier_id = $1
        ORDER BY o.order_time DESC;
      `;
      const result = await this.#pool.query(query, [courierId]);

      // Группировка заказов
      const orders = [];
      const orderMap = new Map();
      result.rows.forEach((row) => {
        if (!orderMap.has(row.id)) {
          orderMap.set(row.id, {
            ...row,
            items: [],
          });
        }
        if (row.item_id) {
          orderMap.get(row.id).items.push({
            id: row.item_id,
            menu_id: row.menu_id,
            quantity: row.quantity,
            price: row.price,
            name: row.dish_name,
            description: row.dish_description,
          });
        }
      });
      orderMap.forEach((value) => orders.push(value));

      logger.debug("Courier orders fetched", { count: orders.length });
      return orders;
    } catch (error) {
      logger.error("Get courier orders error", { error });
      throw error;
    }
  }

  // Обновление статуса заказа
  async changeOrderStatus(orderId, status, courierId = null) {
    await this.init();
    try {
      logger.info("Changing order status", { orderId, status, courierId });
      const validStatuses = [
        "pending",
        "confirmed",
        "in_delivery",
        "delivered",
        "canceled",
      ];
      if (!validStatuses.includes(status)) {
        throw new createError(400, `Invalid status: ${status}`);
      }

      const query = `
        UPDATE orders
        SET status = $1, courier_id = COALESCE($2, courier_id), delivery_time = $3
        WHERE id = $4
        RETURNING *;
      `;
      const deliveryTime = status === "delivered" ? new Date() : null;
      const values = [status, courierId, deliveryTime, orderId];
      const result = await this.#pool.query(query, values);

      if (result.rowCount === 0) {
        throw new createError(404, "Order not found");
      }

      logger.info("Order status updated", { orderId, status });
      return result.rows[0];
    } catch (error) {
      logger.error("Change order status error", { error });
      throw error;
    }
  }

  // Назначение курьера на заказ
  async assignCourier(orderId, courierId) {
    await this.init();
    try {
      logger.info("Assigning courier to order", { orderId, courierId });
      const query = `
        UPDATE orders
        SET courier_id = $1, status = 'in_delivery'
        WHERE id = $2 AND status = 'confirmed'
        RETURNING *;
      `;
      const values = [courierId, orderId];
      const result = await this.#pool.query(query, values);

      if (result.rowCount === 0) {
        throw new createError(
          400,
          "Order not found or not in confirmed status"
        );
      }

      logger.info("Courier assigned", { orderId, courierId });
      return result.rows[0];
    } catch (error) {
      logger.error("Assign courier error", { error });
      throw error;
    }
  }

  // Удаление заказа
  async deleteOrder(orderId) {
    await this.init();
    try {
      logger.info("Deleting order", { orderId });
      const query = `DELETE FROM orders WHERE id = $1;`;
      const result = await this.#pool.query(query, [orderId]);
      if (result.rowCount === 0) {
        throw new createError(404, "Order not found");
      }
      logger.info("Order deleted", { orderId });
      return true;
    } catch (error) {
      logger.error("Delete order error", { error });
      throw error;
    }
  }
}

export default function createOrderService(
  postgresConnection,
  restaurantService,
  paymentsService
) {
  return new OrderService(postgresConnection, restaurantService, paymentsService);
}