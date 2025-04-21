import { createError } from "../errors/errors.js";
//import ordersService from "./OrdersService.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import config from "config";
import logger from "../logger/winstonLogging.js";

const couriers_table = "couriers"
class CouriersService {
    #pool;

    constructor(postgresConnection) {
        this.postgresConnection = postgresConnection;
    }

    async init() {
        this.#pool = await this.postgresConnection.getPool();
    }

    async addAccount(data) {
        await this.init();
        try {
            logger.info("Registering new courier", { data });
            const {
                email,
                password,
                name,
                phone,
            } = data;

            const hashedPassword = await bcrypt.hash(password, 10);
            const query = `
            INSERT INTO ${couriers_table} (email, password, name, phone)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
            `;
            const values = [
                email,
                hashedPassword,
                name,
                phone
            ];
            const result = await this.#pool.query(query, values);
            logger.info("Courier registered", { courier: result.rows[0] });
            return result.rows[0];
        } catch (error) {
            logger.error("Registration error", { error });
            throw error;
        }
    }

    async login(data) {
        await this.init();
        try {
            const { email, password } = data;
            logger.info("Login attempt", { email });
            const query = `SELECT * FROM ${couriers_table} WHERE email = $1;`;
            const result = await this.#pool.query(query, [email]);
            const courier = result.rows[0];

            if (!courier) {
                logger.warn("Login failed - no such email", { email });
                throw new createError("Invalid credentials");
            }

            const match = await bcrypt.compare(password, courier.password);
            if (!match) {
                logger.warn("Login failed - wrong password", { email });
                throw new Error("Invalid credentials");
            }

            const token = jwt.sign(
                { 
                    id: courier.id,
                    email: courier.email
                },
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

    async changeWorkStatus(courierId) {
        await this.init();
        try {
            logger.info("Changing work status for courier ID ", { courierId });
            const query =
                `UPDATE ${couriers_table}
                SET available = NOT available
                WHERE id = $1
                RETURNING available;`
            const values = [courierId];
            const result = await this.#pool.query(query, values);
            return result.rows[0].available;
        } catch (error) {
            logger.error("Changing work status error", { error });
            throw error;
        }
    }

    async getCouriersOrders(courierId) {
        await this.init();
        try {
            logger.info("Viewing orders for courier ID ", { courierId });
            const query =
                `SELECT * FROM orders WHERE courier_id = $1`
            const values = [courierId];
            const result = await this.#pool.query(query, values);
            const order = result.rows;
            return order ? order : new createError(404, `Orders not found`);
        } catch (error) {
            logger.error("Viewing orders error", { error });
            throw error;
        }
    }

    async changeOrderStatus(courierId, data) {
        const { id, state } = data;
        const order = ordersService.findOrderById(id);  //find order in db by ORDER'S id
        if (!order) throw new createError(404, `Order ${id} not found`);
        if (courierId !== order.courier_id) throw new createError(403, "Forbidden: Insufficient permissions");

        return ordersService.changeOrderState(state);
    }
}

export default function createCouriersService(postgresConnection) {
    return new CouriersService(postgresConnection);
}