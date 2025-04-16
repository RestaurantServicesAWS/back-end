import express from 'express';
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import config from 'config';
import { validator } from '../middleware/validation.js';
import { schemaAccount, schemaPassowrd } from '../validation/AccountSchemas.js';

const accountsRoute = (postgresConnection) => {
  const router = express.Router();

  // Инициализация сервиса с передачей postgresConnection
  const accountingServicePromise = import('../service/AccountsService.js').then(module => module.default(postgresConnection));

  const authenticateToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).send({ error: 'Authorization token required' });
    }
    try {
      const decoded = jwt.verify(token, config.get('jwt.secret'));
      req.user = decoded;
      next();
    } catch (error) {
      res.status(403).send({ error: 'Invalid or expired token' });
    }
  };

  // Создание аккаунта
  router.post(
    '/',
    validator(schemaAccount),
    asyncHandler(async (req, res) => {
      const accountingService = await accountingServicePromise;
      const accountData = req.body;
      const account = await accountingService.addAccount(accountData);
      res.status(201).send({ message: 'Account created', account });
    })
  );

  // Логин
  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      const accountingService = await accountingServicePromise;
      const token = await accountingService.login(req.body);
      res.send(token);
    })
  );

  // Получение аккаунта по email
  router.get(
    '/:email',
    authenticateToken,
    asyncHandler(async (req, res) => {
      const accountingService = await accountingServicePromise;
      const account = await accountingService.getAccount(req.params.email);
      res.status(200).send(account);
    })
  );

  // Обновление аккаунта
  router.put(
    '/',
    authenticateToken,
    validator(schemaAccount),
    asyncHandler(async (req, res) => {
      const accountingService = await accountingServicePromise;
      const updatedAccount = await accountingService.updateAccount(req.user.email, req.body);
      res.send({ message: 'Account updated', account: updatedAccount });
    })
  );

  // Удаление аккаунта
  router.delete(
    '/',
    authenticateToken,
    asyncHandler(async (req, res) => {
      const accountingService = await accountingServicePromise;
      await accountingService.delete(req.user.email);
      res.status(200).send({ message: 'Account deleted' });
    })
  );

  return router;
};

export default accountsRoute;