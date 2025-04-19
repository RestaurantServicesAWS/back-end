import { createError } from "../errors/errors.js";
import ordersService from ".";

const table = "couriers"

class CouriersService {
    constructor() {

    }
    async addAccount() {

    }

    async login() {

    }

    async changeWorkStatus(courierId) {
        return await client.query(
            `UPDATE ${table}
            SET is_available = NOT is_available
            WHERE id = $1
            RETURNING is_available`
        );
    }

    async getCouriersOrders(courierId) {
        const order = await pool.query(
            'SELECT * FROM orders WHERE courier_id = $1'
        );
        return order ? order : new createError(404, `Orders not found`);
    }

    async changeOrderStatus(courierId, data) {
        const { id, state } = data;
        const order = ordersService.findOrderById(id);  //find order in db by ORDER'S id
        if (!order) throw new createError(404, `Order ${id} not found`);
        if (courierId !== order.courier_id) throw new createError(403, "Forbidden: Insufficient permissions");

        return ordersService.changeOrderState(state);
    }
}

export default new CouriersService();