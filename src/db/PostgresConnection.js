import pkg from 'pg';
const { Pool } = pkg;
import logger from '../logger/winstonLogging.js';

class PostgresConnection {
  #pool;
  #isConnected;

  constructor() {
    this.#pool = null;
    this.#isConnected = false;
  }

  async connect() {
    if (this.#isConnected && this.#pool) {
      return this.#pool;
    }

    try {
      // Временное использование параметров напрямую
      this.#pool = new Pool({
        user: 'admin',
        host: '51.20.132.5',
        database: 'testdb',
        password: 'qwerty1488',
        port: 5432,
      });

      await this.#pool.connect();
      this.#isConnected = true;
      logger.info('Successfully connected to PostgreSQL database', {
        host: '51.20.132.5',
        port: 5432,
        database: 'testdb',
      });
      return this.#pool;
    } catch (error) {
      logger.error('Failed to connect to PostgreSQL database', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async getPool() {
    if (!this.#pool || !this.#isConnected) {
      await this.connect();
    }
    return this.#pool;
  }

  async getClient() {
    if (!this.#pool || !this.#isConnected) {
      await this.connect();
    }
    return this.#pool.connect();
  }

  async close() {
    if (!this.#pool || !this.#isConnected) {
      logger.warn('No active PostgreSQL connection to close');
      return;
    }

    try {
      await this.#pool.end();
      this.#isConnected = false;
      this.#pool = null;
      logger.info('PostgreSQL connection closed successfully');
    } catch (error) {
      logger.error('PostgreSQL connection close failed', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

const postgresConnection = new PostgresConnection();

process.on('SIGINT', async () => {
  await postgresConnection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await postgresConnection.close();
  process.exit(0);
});

export default postgresConnection;