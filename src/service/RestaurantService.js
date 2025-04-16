import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

class RestaurantService {
  async addDish(data) {
    const { restaurant_id, name, description, price } = data;
    const query = `
      INSERT INTO dishes (restaurant_id, name, description, price, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [restaurant_id, name, description, price, new Date()];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async updateDish(dishId, data) {
    const { name, description, price } = data;
    const query = `
      UPDATE dishes
      SET name = $1, description = $2, price = $3
      WHERE id = $4
      RETURNING *;
    `;
    const result = await pool.query(query, [name, description, price, dishId]);
    if (result.rowCount === 0) {
      throw new Error('Dish not found');
    }
    return result.rows[0];
  }

  async deleteDish(dishId) {
    const query = `DELETE FROM dishes WHERE id = $1;`;
    const result = await pool.query(query, [dishId]);
    if (result.rowCount === 0) {
      throw new Error('Dish not found');
    }
    return true;
  }

  async getMenu(restaurantId) {
    const query = `SELECT * FROM dishes WHERE restaurant_id = $1;`;
    const result = await pool.query(query, [restaurantId]);
    return result.rows;
  }

  async acceptOrder(data) {
    const { restaurant_id, user_id, items, cooking_time } = data;
    const query = `
      INSERT INTO orders (restaurant_id, user_id, items, status, cooking_time, start_cooking_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [restaurant_id, user_id, JSON.stringify(items), 'pending', cooking_time, new Date(), new Date()];
    const result = await pool.query(query, values);
    const order = result.rows[0];

    // Обновляем статус на "cooking"
    await this.updateOrderStatus(order.id, 'cooking');

    // Устанавливаем таймер для смены статуса на "ready" после cooking_time
    setTimeout(async () => {
      await this.updateOrderStatus(order.id, 'ready');
    }, cooking_time * 60 * 1000); // cooking_time в минутах, переводим в миллисекунды

    return order;
  }

  async updateOrderStatus(orderId, status) {
    const query = `
      UPDATE orders
      SET status = $1
      WHERE id = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [status, orderId]);
    if (result.rowCount === 0) {
      throw new Error('Order not found');
    }
    return result.rows[0];
  }

  async getOrders(restaurantId) {
    const query = `SELECT * FROM orders WHERE restaurant_id = $1;`;
    const result = await pool.query(query, [restaurantId]);
    return result.rows;
  }
}

export default new RestaurantService();