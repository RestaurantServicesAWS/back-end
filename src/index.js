import express from 'express';
import accountsRoute from './routes/accountsRoute.js';
import { errorHandler } from './errors/errors.js';
import config from 'config';
import dotenv from 'dotenv';
import postgresConnection from './db/PostgresConnection.js'; // Предполагаю, что файл называется PostgresConnection.js

dotenv.config();

// app.use(cors()); 
const app = express();

app.use(express.json());

app.use('/accounts', accountsRoute(postgresConnection));


app.use((req, res) => {
  res.status(404).send(`path ${req.path} is not found`);
});


app.use(errorHandler);


const port = config.get('port') || 3500;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});


process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await postgresConnection.close();
    console.log('PostgreSQL connection pool closed');
    process.exit(0);
  });
});