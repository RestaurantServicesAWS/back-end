import express from 'express';
import asyncHandler from 'express-async-handler';
import { validator } from '../middleware/validation.js';
import { schemaDish, schemaOrder } from '../validation/RestaurantSchemas.js';
import restaurantService from '../service/RestaurantService.js';

const restaurantRoutes = express.Router();

// Middleware для проверки токена Cognito
// const authenticateToken = async (req, res, next) => {
//   const token = req.headers.authorization?.split(' ')[1];
//   if (!token) {
//     return res.status(401).send({ error: 'Authorization token required' });
//   }
//   // Здесь должна быть логика проверки токена через Cognito
//   next();
// };

// Добавить блюдо в меню
restaurantRoutes.post(
  '/menu',
  validator(schemaDish),
  asyncHandler(async (req, res) => {
    const dish = await restaurantService.addDish(req.body);
    res.status(201).send({ message: 'Dish added to menu', dish });
  })
);

// Обновить блюдо в меню
restaurantRoutes.put(
  '/menu/:dishId',
  validator(schemaDish),
  asyncHandler(async (req, res) => {
    const dish = await restaurantService.updateDish(req.params.dishId, req.body);
    res.status(200).send({ message: 'Dish updated', dish });
  })
);

// Удалить блюдо из меню
restaurantRoutes.delete(
  '/menu/:dishId',
  asyncHandler(async (req, res) => {
    await restaurantService.deleteDish(req.params.dishId);
    res.status(200).send({ message: 'Dish deleted' });
  })
);

// Получить меню ресторана
restaurantRoutes.get(
  '/menu/:restaurantId',
  asyncHandler(async (req, res) => {
    const menu = await restaurantService.getMenu(req.params.restaurantId);
    res.status(200).send(menu);
  })
);

// Принять заказ и установить время приготовления
restaurantRoutes.post(
  '/orders',
  validator(schemaOrder),
  asyncHandler(async (req, res) => {
    const order = await restaurantService.acceptOrder(req.body);
    res.status(201).send({ message: 'Order accepted', order });
  })
);

// Получить список заказов ресторана
restaurantRoutes.get(
  '/orders/:restaurantId',
  asyncHandler(async (req, res) => {
    const orders = await restaurantService.getOrders(req.params.restaurantId);
    res.status(200).send(orders);
  })
);

export default restaurantRoutes;