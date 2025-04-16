import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import config from 'config';

class AccountsService {
  #pool;

  constructor(postgresConnection) {
    this.postgresConnection = postgresConnection;
  }

  // Инициализация пула при первом использовании
  async init() {
    this.#pool = await this.postgresConnection.getPool();
  }

  async addAccount(data) {
    await this.init();
    const { email, username, password, role } = data;
    const hashedPassword = await bcrypt.hash(password, config.get('accounting.salt_rounds'));
    const query = `
      INSERT INTO accounts (email, username, password, role, is_blocked, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [email, username, hashedPassword, role, false, new Date()];
    const result = await this.#pool.query(query, values);
    return result.rows[0];
  }

  async updatePassword({ email, password }) {
    await this.init();
    const hashedPassword = await bcrypt.hash(password, config.get('accounting.salt_rounds'));
    const query = `
      UPDATE accounts
      SET password = $1
      WHERE email = $2
      RETURNING *;
    `;
    const result = await this.#pool.query(query, [hashedPassword, email]);
    if (result.rowCount === 0) {
      throw new Error('Account not found');
    }
    return result.rows[0];
  }

  async getAccount(email) {
    await this.init();
    const query = `SELECT * FROM accounts WHERE email = $1;`;
    const result = await this.#pool.query(query, [email]);
    if (result.rowCount === 0) {
      throw new Error('Account not found');
    }
    return result.rows[0];
  }

  async setAccountBlockStatus(email, isBlocked) {
    await this.init();
    const query = `
      UPDATE accounts
      SET is_blocked = $1
      WHERE email = $2
      RETURNING *;
    `;
    const result = await this.#pool.query(query, [isBlocked, email]);
    if (result.rowCount === 0) {
      throw new Error('Account not found');
    }
    return result.rows[0];
  }

  async delete(email) {
    await this.init();
    const query = `DELETE FROM accounts WHERE email = $1;`;
    const result = await this.#pool.query(query, [email]);
    if (result.rowCount === 0) {
      throw new Error('Account not found');
    }
    return true;
  }

  async login({ email, password }) {
    await this.init();
    const account = await this.getAccount(email);
    if (account.is_blocked) {
      throw new Error('Account is blocked');
    }
    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }
    const token = jwt.sign(
      { email: account.email, role: account.role, username: account.username },
      config.get('jwt.secret'),
      { expiresIn: '1h' }
    );
    return { token };
  }
}

export default async (postgresConnection) => {
  const service = new AccountsService(postgresConnection);
  await service.init();
  return service;
};