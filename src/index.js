import express from 'express';
import accountsRoute from './routes/accounts.js';
import { errorHandler } from './errors/errors.js';
import config from 'config';
import dotenv from 'dotenv';
import postgresConnection from './db/PostgresConnection.js'; // Предполагаю, что файл называется PostgresConnection.js

dotenv.config();

const app = express();

app.use(express.json());

// Подключение маршрутов
app.use('/accounts', accountsRoute(postgresConnection));

// Обработка 404
app.use((req, res) => {
  res.status(404).send(`path ${req.path} is not found`);
});

// Обработка ошибок
app.use(errorHandler);

// Запуск сервера
const port = config.get('port') || 3500;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});