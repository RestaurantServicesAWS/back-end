import express from 'express';
import accountsRoute from './routes/accountsRoute.js';
import restaurantsRoute from './routes/restaurantRoute.js';
import couriersRoute from './routes/couriersRoute.js';
import paymentsRoute from './routes/paymentsRoutes.js';
import { errorHandler } from './errors/errors.js';
import config from 'config';
import dotenv from 'dotenv';
import postgresConnection from './db/PostgresConnection.js'; 

dotenv.config();

// app.use(cors()); 
const app = express();

app.use(express.json());

app.use('/accounts', accountsRoute(postgresConnection));
app.use('/restaurants', restaurantsRoute(postgresConnection));
app.use('/couriers', couriersRoute(postgresConnection));
app.use('/payments', paymentsRoute(postgresConnection));


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