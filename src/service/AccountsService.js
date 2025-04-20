import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "config";
import { createError } from "../errors/errors.js";
const ACCOUNTS_SERVICE = "accounts";

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

    const account = await this.getAccount(email);
    if (account) {
      throw createError(400, `Account with email: ${email} already exists`);
    }
    console.log(account);
    

    const hashedPassword = await bcrypt.hash(
      password,
      config.get("accounting.salt_rounds")
    );

    const query = `
      INSERT INTO ${ACCOUNTS_SERVICE} (email, name, password, is_blocked, created_at, city, street, building, flat, phone)
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
    if (!account) {
      throw createError(404, "Account not found");
    }
    if (account.is_blocked) {
      throw createError(400, "Account is blocked");
    }
    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (!isPasswordValid) {
      throw createError(400, "Invalid password");
    }
    const token = jwt.sign(
      {
        id: account.id,
        email: account.email,
        name: account.name,
      },
      config.get("jwt.secret"),
      { expiresIn: "7d" }
    );
    return { token };
  }

  async getAccount(email) {
    await this.init();
    const query = `SELECT * FROM ${ACCOUNTS_SERVICE} WHERE email = $1;`;
    const result = await this.#pool.query(query, [email]);    
    return result.rowCount > 0 ? result.rows[0] : null;
  }

  async updateAccount(email, data) {
    await this.init();
    const { name, password, city, street, building, flat, phone } = data;
    const hashedPassword = password
      ? await bcrypt.hash(password, config.get("accounting.salt_rounds"))
      : undefined;
    const query = `
      UPDATE ${ACCOUNTS_SERVICE}
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
      throw createError(400, "Account not found");
    }
    return result.rows[0];
  }

  async delete(email) {
    await this.init();
    const query = `DELETE FROM ${ACCOUNTS_SERVICE} WHERE email = $1;`;
    const result = await this.#pool.query(query, [email]);
    if (result.rowCount === 0) {
      throw createError(400, "Account not found");
    }
    return true;
  }
}

export default async (postgresConnection) => {
  const service = new AccountsService(postgresConnection);
  await service.init();
  return service;
};
