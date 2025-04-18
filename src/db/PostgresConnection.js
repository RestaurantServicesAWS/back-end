import pkg from 'pg';
const { Pool } = pkg;
import logger from '../logger/winstonLogging.js';
import config from 'config';

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
      this.#pool = new Pool({
        user: config.get('database.user'),
        host: config.get('database.host'),
        database: config.get('database.name'),
        password: config.get('database.password'),
        port: config.get('database.port'),
      });

      await this.#pool.connect();
      this.#isConnected = true;
      logger.info('Successfully connected to PostgreSQL database', {
        host: config.get('database.host'),
        port: config.get('database.port'),
        database: config.get('database.name'),
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

export default postgresConnection;