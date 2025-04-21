import express from "express";
import jwt from "jsonwebtoken";
import config from "config";
import logger from "../logger/winstonLogging.js";
import { createError } from "../errors/errors.js";

const router = express.Router();

// Middleware для проверки JWT-токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>
  if (!token) {
    logger.warn("No token provided", { url: req.originalUrl });
    throw new createError(401, "Unauthorized: No token provided");
  }

  try {
    const decoded = jwt.verify(token, config.get("jwt.secret"));
    req.user = decoded; // { id, email, name } для клиентов, { id, email } для ресторанов/курьеров
    next();
  } catch (error) {
    logger.warn("Invalid token", { url: req.originalUrl, error });
    throw new createError(401, "Unauthorized: Invalid token");
  }
};

// Middleware для проверки роли (client, restaurant, courier)
const checkRole = (role) => (req, res, next) => {
  if (!req.user || (role === "client" && !req.user.name) || (role !== "client" && req.user.name)) {
    logger.warn("Invalid role", { user: req.user, requiredRole: role });
    throw new createError(403, `Forbidden: ${role} access required`);
  }
  next();
};

// Создание заказа (для клиентов)
router.post("/", authenticateToken, checkRole("client"), async (req, res, next) => {
  try {
    const { restaurant_id, items, description } = req.body;
    if (!restaurant_id || !items || !Array.isArray(items) || items.length === 0) {
      throw new createError(400, "Missing or invalid restaurant_id or items");
    }
    if (items.some((item) => !item.menu_id || !item.quantity || item.quantity <= 0)) {
      throw new createError(400, "Invalid items: menu_id and quantity (>0) required");
    }

    const order = await req.orderService.createOrder(req.user.id, {
      restaurant_id,
      items,
      description,
    });
    logger.info("Order created via API", { orderId: order.id, clientId: req.user.id });
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

// Получение заказа по ID (для клиента, ресторана, курьера)
router.get("/:id", authenticateToken, async (req, res, next) => {
  try {
    const order = await req.orderService.getOrderById(req.params.id);
    const isClient = req.user.name && order.client_id === req.user.id;
    const isRestaurant = !req.user.name && order.restaurant_id === req.user.id;
    const isCourier = !req.user.name && order.courier_id === req.user.id;

    if (!isClient && !isRestaurant && !isCourier) {
      logger.warn("Unauthorized access to order", { orderId: req.params.id, user: req.user });
      throw new createError(403, "Forbidden: You do not have access to this order");
    }

    logger.debug("Order fetched via API", { orderId: req.params.id });
    res.json(order);
  } catch (error) {
    next(error);
  }
});

// Получение заказов клиента
router.get("/client", authenticateToken, checkRole("client"), async (req, res, next) => {
  try {
    const orders = await req.orderService.getClientOrders(req.user.id);
    logger.debug("Client orders fetched via API", { clientId: req.user.id, count: orders.length });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// Получение заказов ресторана
router.get("/restaurant", authenticateToken, checkRole("restaurant"), async (req, res, next) => {
  try {
    const orders = await req.orderService.getRestaurantOrders(req.user.id);
    logger.debug("Restaurant orders fetched via API", { restaurantId: req.user.id, count: orders.length });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// Получение заказов курьера
router.get("/courier", authenticateToken, checkRole("courier"), async (req, res, next) => {
  try {
    const orders = await req.orderService.getCourierOrders(req.user.id);
    logger.debug("Courier orders fetched via API", { courierId: req.user.id, count: orders.length });
    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// Обновление статуса заказа (для ресторанов и курьеров)
router.patch("/:id/status", authenticateToken, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      throw new createError(400, "Status is required");
    }

    const order = await req.orderService.getOrderById(req.params.id);
    const isRestaurant = !req.user.name && order.restaurant_id === req.user.id;
    const isCourier = !req.user.name && order.courier_id === req.user.id;

    if (!isRestaurant && !isCourier) {
      logger.warn("Unauthorized status update", { orderId: req.params.id, user: req.user });
      throw new createError(403, "Forbidden: Only restaurant or assigned courier can update status");
    }

    const updatedOrder = await req.orderService.changeOrderStatus(
      req.params.id,
      status,
      isCourier ? req.user.id : null
    );
    logger.info("Order status updated via API", { orderId: req.params.id, status });
    res.json(updatedOrder);
  } catch (error) {
    next(error);
  }
});

// Назначение курьера на заказ (для системы/админа)
router.patch("/:id/assign-courier", authenticateToken, async (req, res, next) => {
  try {
    const { courier_id } = req.body;
    if (!courier_id) {
      throw new createError(400, "Courier ID is required");
    }

    // Предполагается, что только админ или система может назначать курьера
    // Если доступ ограничен, добавьте проверку роли админа
    const updatedOrder = await req.orderService.assignCourier(req.params.id, courier_id);
    logger.info("Courier assigned via API", { orderId: req.params.id, courierId: courier_id });
    res.json(updatedOrder);
  } catch (error) {
    next(error);
  }
});

// Удаление заказа (для клиентов или админа)
router.delete("/:id", authenticateToken, async (req, res, next) => {
  try {
    const order = await req.orderService.getOrderById(req.params.id);
    if (req.user.name && order.client_id !== req.user.id) {
      logger.warn("Unauthorized order deletion", { orderId: req.params.id, user: req.user });
      throw new createError(403, "Forbidden: Only the client can delete their order");
    }

    await req.orderService.deleteOrder(req.params.id);
    logger.info("Order deleted via API", { orderId: req.params.id });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Обработка ошибок
router.use((error, req, res, next) => {
  logger.error("API error", { error, url: req.originalUrl });
  res.status(error.status || 500).json({
    error: {
      message: error.message || "Internal Server Error",
    },
  });
});

export default (orderService) => {
  router.orderService = orderService;
  return router;
};