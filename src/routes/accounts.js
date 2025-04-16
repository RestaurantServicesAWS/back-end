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

  // Создание аккаунта (user, restaurant, courier)
  router.post(
    '/:role(user|restaurant|courier)',
    validator(schemaAccount),
    asyncHandler(async (req, res) => {
      const accountingService = await accountingServicePromise;
      const { role } = req.params;
      const accountData = { ...req.body, role };
      const account = await accountingService.addAccount(accountData);
      res.status(201).send({ message: `${role} account created`, account });
    })
  );

  // Обновление пароля
  router.put(
    '/',
    authenticateToken,
    validator(schemaPassowrd),
    asyncHandler(async (req, res) => {
      const accountingService = await accountingServicePromise;
      const updatedAccount = await accountingService.updatePassword(req.body);
      res.send({ message: 'Password updated', account: updatedAccount });
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

  // Блокировка/разблокировка аккаунта
  router.put(
    '/:action(block|unblock)/:email',
    authenticateToken,
    asyncHandler(async (req, res) => {
      const accountingService = await accountingServicePromise;
      const { action, email } = req.params;
      const isBlocked = action === 'block';
      const updatedAccount = await accountingService.setAccountBlockStatus(email, isBlocked);
      res.status(200).send({ message: `Account ${isBlocked ? 'blocked' : 'unblocked'}`, account: updatedAccount });
    })
  );

  // Удаление аккаунта
  router.delete(
    '/:email',
    authenticateToken,
    asyncHandler(async (req, res) => {
      const accountingService = await accountingServicePromise;
      await accountingService.delete(req.params.email);
      res.status(200).send({ message: 'Account deleted' });
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

  return router;
};

export default accountsRoute;