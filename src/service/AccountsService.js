import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "config";

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
    const { email, name, password, city, street, building, flat, phone } = data;
    const hashedPassword = await bcrypt.hash(
      password,
      config.get("accounting.salt_rounds")
    );
    const query = `
      INSERT INTO accounts (email, name, password, is_blocked, created_at, city, street, building, flat, phone)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const values = [
      email,
      name,
      hashedPassword,
      false,
      new Date(),
      city,
      street,
      building,
      flat,
      phone,
    ];
    const result = await this.#pool.query(query, values);
    return result.rows[0];
  }

  async login({ email, password }) {
    await this.init();
    const account = await this.getAccount(email);
    if (account.is_blocked) {
      throw new Error("Account is blocked");
    }
    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }
    const token = jwt.sign(
      { email: account.email, name: account.name },
      config.get("jwt.secret"),
      { expiresIn: "1h" }
    );
    return { token };
  }

  async getAccount(email) {
    await this.init();
    const query = `SELECT * FROM accounts WHERE email = $1;`;
    const result = await this.#pool.query(query, [email]);
    if (result.rowCount === 0) {
      throw new Error("Account not found");
    }
    return result.rows[0];
  }

  async updateAccount(email, data) {
    await this.init();
    const { name, password, city, street, building, flat, phone } = data;
    const hashedPassword = password
      ? await bcrypt.hash(password, config.get("accounting.salt_rounds"))
      : undefined;
    const query = `
      UPDATE accounts
      SET 
        name = COALESCE($1, name),
        password = COALESCE($2, password),
        city = COALESCE($3, city),
        street = COALESCE($4, street),
        building = COALESCE($5, building),
        flat = COALESCE($6, flat),
        phone = COALESCE($7, phone)
      WHERE email = $8
      RETURNING *;
    `;
    const values = [
      name,
      hashedPassword,
      city,
      street,
      building,
      flat,
      phone,
      email,
    ];
    const result = await this.#pool.query(query, values);
    if (result.rowCount === 0) {
      throw new Error("Account not found");
    }
    return result.rows[0];
  }

  async delete(email) {
    await this.init();
    const query = `DELETE FROM accounts WHERE email = $1;`;
    const result = await this.#pool.query(query, [email]);
    if (result.rowCount === 0) {
      throw new Error("Account not found");
    }
    return true;
  }
}

export default async (postgresConnection) => {
  const service = new AccountsService(postgresConnection);
  await service.init();
  return service;
};
