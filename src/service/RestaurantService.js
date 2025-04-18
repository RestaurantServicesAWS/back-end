import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "config";
import logger from "../logger/winstonLogging.js";

class RestaurantService {
  #pool;

  constructor(postgresConnection) {
    this.postgresConnection = postgresConnection;
  }

  async init() {
    this.#pool = await this.postgresConnection.getPool();
  }

  async register(data) {
    await this.init();
    try {
      logger.info("Registering restaurant", { data });
      const {
        email,
        password,
        name,
        city,
        street,
        building,
        phone,
        description,
      } = data;

      const hashedPassword = await bcrypt.hash(password, 10);
      const query = `
        INSERT INTO restaurants (email, password, name, city, street, building, phone, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, email, name, city, street, building, phone, description;
      `;
      const values = [
        email,
        hashedPassword,
        name,
        city,
        street,
        building,
        phone,
        description,
      ];
      const result = await this.#pool.query(query, values);
      logger.info("Restaurant registered", { restaurant: result.rows[0] });
      return result.rows[0];
    } catch (error) {
      logger.error("Registration error", { error });
      throw error;
    }
  }

  async login({ email, password }) {
    await this.init();
    try {
      logger.info("Login attempt", { email });
      const query = `SELECT * FROM restaurants WHERE email = $1;`;
      const result = await this.#pool.query(query, [email]);
      const restaurant = result.rows[0];

      if (!restaurant) {
        logger.warn("Login failed - no such email", { email });
        throw new Error("Invalid credentials");
      }

      const match = await bcrypt.compare(password, restaurant.password);
      if (!match) {
        logger.warn("Login failed - wrong password", { email });
        throw new Error("Invalid credentials");
      }

      const token = jwt.sign(
        { id: restaurant.id, email: restaurant.email },
        config.get("jwt.secret"),
        { expiresIn: "7d" }
      );

      logger.info("Login successful", { email });
      return { token };
    } catch (error) {
      logger.error("Login error", { error });
      throw error;
    }
  }

  async getById(id) {
    await this.init();
    try {
      logger.info("Getting restaurant by ID", { id });
      const query = `SELECT id, email, name, city, street, building, phone, description FROM restaurants WHERE id = $1;`;
      const result = await this.#pool.query(query, [id]);
      if (result.rowCount === 0) throw new Error("Restaurant not found");
      return result.rows[0];
    } catch (error) {
      logger.error("GetById error", { error });
      throw error;
    }
  }

  async update(id, data) {
    await this.init();
    try {
      logger.info("Updating restaurant", { id, data });
      const {
        email,
        password,
        name,
        city,
        street,
        building,
        phone,
        description,
      } = data;

      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

      const query = `
        UPDATE restaurants
        SET email = $1,
            ${hashedPassword ? "password = $2," : ""}
            name = $3,
            city = $4,
            street = $5,
            building = $6,
            phone = $7,
            description = $8
        WHERE id = $9
        RETURNING id, email, name, city, street, building, phone, description;
      `;

      const values = hashedPassword
        ? [
            email,
            hashedPassword,
            name,
            city,
            street,
            building,
            phone,
            description,
            id,
          ]
        : [email, name, city, street, building, phone, description, id];

      const result = await this.#pool.query(query, values);
      if (result.rowCount === 0) throw new Error("Restaurant not found");

      logger.info("Restaurant updated", { id });
      return result.rows[0];
    } catch (error) {
      logger.error("Update error", { error });
      throw error;
    }
  }

  async delete(id) {
    await this.init();
    try {
      logger.info("Deleting restaurant", { id });
      const query = `DELETE FROM restaurants WHERE id = $1;`;
      const result = await this.#pool.query(query, [id]);
      if (result.rowCount === 0) throw new Error("Restaurant not found");
      logger.info("Restaurant deleted", { id });
      return true;
    } catch (error) {
      logger.error("Delete error", { error });
      throw error;
    }
  }

  async addDish(data) {
    await this.init();
    try {
      logger.info("Adding dish", { data });
      const { restaurant_id, name, description, price } = data;
      const query = `
        INSERT INTO dishes (restaurant_id, name, description, price)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      
      const values = [restaurant_id, name, description, price]; 
      const result = await this.#pool.query(query, values);
      
      logger.debug("Dish added", { dish: result.rows[0] });
      return result.rows[0];
    } catch (error) {
      logger.error("Error adding dish", { error });
      throw error;
    }
  }
  

  async updateDish(dishId, data) {
    await this.init();
    try {
      logger.info("Updating dish", { dishId, data });
      const { name, description, price } = data;
      const query = `
        UPDATE dishes
        SET name = $1, description = $2, price = $3
        WHERE id = $4
        RETURNING *;
      `;
      const result = await this.#pool.query(query, [
        name,
        description,
        price,
        dishId,
      ]);
  
      if (result.rowCount === 0) throw new Error("Dish not found");
      logger.info("Dish updated", { dishId });
      return result.rows[0];
    } catch (error) {
      logger.error("Update dish error", { error });
      throw error;
    }
  }
  

  async deleteDish(dishId) {
    await this.init();
    try {
      logger.info("Deleting dish", { dishId });
      const query = `DELETE FROM dishes WHERE id = $1;`;
      const result = await this.#pool.query(query, [dishId]);
      if (result.rowCount === 0) throw new Error("Dish not found");
      logger.info("Dish deleted", { dishId });
      return true;
    } catch (error) {
      logger.error("Delete dish error", { error });
      throw error;
    }
  }

  async getMenu(restaurantId) {
    await this.init();
    try {
      logger.info("Fetching menu", { restaurantId });
      const query = `SELECT * FROM dishes WHERE restaurant_id = $1;`;
      const result = await this.#pool.query(query, [restaurantId]);
      logger.debug("Menu fetched", { count: result.rows.length });
      return result.rows;
    } catch (error) {
      logger.error("Get menu error", { error });
      throw error;
    }
  }
}

export default function createRestaurantService(postgresConnection) {
  return new RestaurantService(postgresConnection);
}
