import express from "express";
import asyncHandler from "express-async-handler";
import { validator } from "../middleware/validation.js";
import {
  schemaDish,
  schemaRestaurant,
} from "../validation/RestaurantSchemas.js";

const restaurantRoute = (postgresConnection) => {
  const router = express.Router();

  let restaurantService;

  const getRestaurantService = async () => {
    if (!restaurantService) {
      const module = await import("../service/RestaurantService.js");
      restaurantService = module.default(postgresConnection);
    }
    return restaurantService;
  };

  // Регистрация ресторана
  router.post(
    "/register",
    validator(schemaRestaurant),
    asyncHandler(async (req, res) => {
      const service = await getRestaurantService();
      const restaurant = await service.register(req.body);
      res.status(201).send({ message: "Restaurant registered", restaurant });
    })
  );

  // Логин ресторана
  router.post(
    "/login",
    asyncHandler(async (req, res) => {
      const service = await getRestaurantService();
      const { token } = await service.login(req.body); 
      res.status(200).send({ token });
    })
  );

  // Получение ресторана по ID
  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const service = await getRestaurantService();
      const restaurant = await service.getById(req.params.id);
      res.status(200).send(restaurant);
    })
  );

  // Обновление ресторана
  router.put(
    "/:id",
    validator(schemaRestaurant),
    asyncHandler(async (req, res) => {
      const service = await getRestaurantService();
      const restaurant = await service.update(req.params.id, req.body);
      res.status(200).send({ message: "Restaurant updated", restaurant });
    })
  );

  // Удаление ресторана
  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const service = await getRestaurantService();
      await service.delete(req.params.id);
      res.status(200).send({ message: "Restaurant deleted" });
    })
  );

  // Добавить блюдо в меню
  router.post(
    "/menu",
    validator(schemaDish),
    asyncHandler(async (req, res) => {
      const service = await getRestaurantService();
      const dish = await service.addDish(req.body);
      res.status(201).send({ message: "Dish added to menu", dish });
    })
  );

  // Обновить блюдо в меню
  router.put(
    "/menu/:dishId",
    validator(schemaDish),
    asyncHandler(async (req, res) => {
      const service = await getRestaurantService();
      const dish = await service.updateDish(req.params.dishId, req.body);
      res.status(200).send({ message: "Dish updated", dish });
    })
  );

  // Удалить блюдо из меню
  router.delete(
    "/menu/:dishId",
    asyncHandler(async (req, res) => {
      const service = await getRestaurantService();
      await service.deleteDish(req.params.dishId);
      res.status(200).send({ message: "Dish deleted" });
    })
  );

  // Получить меню ресторана
  router.get(
    "/menu/:restaurantId",
    asyncHandler(async (req, res) => {
      const service = await getRestaurantService();
      const menu = await service.getMenu(req.params.restaurantId);
      res.status(200).send(menu);
    })
  );

  return router;
};

export default restaurantRoute;
