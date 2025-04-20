import paypalClient from './PaypalClient.js';
import paypal from '@paypal/checkout-server-sdk';
import { v4 as uuidv4 } from 'uuid';
import logger from "../logger/winstonLogging.js";

const couriers_table = "couriers"
class PaymentsService {
    #pool;

    constructor(postgresConnection) {
        this.postgresConnection = postgresConnection;
    }

    async init() {
        this.#pool = await this.postgresConnection.getPool();
    }

    async #calculateAmount(orderId) {
        const query = 'SELECT total_cost FROM orders WHERE id = $1';
        const values = [orderId];
        return await this.#pool.query(query, values);
    }

    async createPayment(clientId, data) {
        await this.init();
        const { orderId } = data;
        const amount = this.#calculateAmount(orderId);
        
        logger.info(`Creating payment for Order ID ${orderId}`)

        const createRequest = new paypal.orders.OrdersCreateRequest();
        createRequest.headers['PayPal-Request-Id'] = uuidv4();
        createRequest.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                reference_id: String(orderId),
                amount: {
                    currency_code: 'USD',
                    value: amount,
                },
            }],
            payment_source: {
                card: {
                    number: "4032030189557607", // Тестовая карта
                    expiry: "2030-05",
                    security_code: "123",
                    name: "Test User",
                    billing_address: {
                        address_line_1: "123 Test St",
                        admin_area_2: "Tel Aviv",
                        admin_area_1: "TA",
                        postal_code: "61000",
                        country_code: "IL"
                    }
                }
            }
        });

        const createResponse = await paypalClient.execute(createRequest);
        const paypalId = createResponse.result.id;

        const checkRequest = new paypal.orders.OrdersGetRequest(paypalId);
        const orderDetails = await paypalClient.execute(checkRequest);
        logger.info('PayPal Order ID:', paypalId);
        logger.info('Order Status:', orderDetails.result.status);

        const query = `
            INSERT INTO payments (order_id, amount, status, paypal_id, client_id, last_digits, payment_time )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const values = [orderId, amount, 'PAID', paypalId, clientId, orderDetails.result.payment_source.card.last_digits, new Date()];
        await this.#pool.query(query, values);

        return 'PAID';
    }
}

export default function createPaymentsService(postgresConnection) {
    return new PaymentsService(postgresConnection);
}