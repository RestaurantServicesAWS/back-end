import express from "express";
import asyncHandler from "express-async-handler";
import { authenticateToken } from "../middleware/validation.js";
import { validator } from "../middleware/validation.js";
import { schemaAccount } from "../validation/AccountSchemas.js";

const accountsRoute = (postgresConnection) => {
  const router = express.Router();

  let accountingService;

  const getAccountingService = async () => {
    if (!accountingService) {
      const module = await import("../service/AccountsService.js");
      accountingService = module.default(postgresConnection);
    }
    return accountingService;
  };

  // Создание аккаунта
  router.post(
    "/",
    validator(schemaAccount),
    asyncHandler(async (req, res) => {
      const service = await getAccountingService();
      const account = await service.addAccount(req.body);
      res.status(201).send({ message: "Account created", account });
    })
  );

  // Логин
  router.post(
    "/login",
    asyncHandler(async (req, res) => {
      const service = await getAccountingService();
      const token = await service.login(req.body);
      res.send(token);
    })
  );

  // Получение аккаунта по email
  router.get(
    "/:email",
    authenticateToken,
    asyncHandler(async (req, res) => {
      const service = await getAccountingService();
      const account = await service.getAccount(req.params.email);
      res.status(200).send(account);
    })
  );

  // Обновление аккаунта
  router.put(
    "/",
    authenticateToken,
    validator(schemaAccount),
    asyncHandler(async (req, res) => {
      const service = await getAccountingService();
      const updatedAccount = await service.updateAccount(req.user.email, req.body);
      res.send({ message: "Account updated", account: updatedAccount });
    })
  );

  // Удаление аккаунта
  router.delete(
    "/",
    authenticateToken,
    asyncHandler(async (req, res) => {
      const service = await getAccountingService();
      await service.delete(req.user.email);
      res.status(200).send({ message: "Account deleted" });
    })
  );

  return router;
};

export default accountsRoute;