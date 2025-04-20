import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { validator } from '../middleware/validation.js';
import { schemaCreatePayment } from "../validation/PaymentsSchemas.js";
import dotenv from "dotenv";
import { authenticateToken } from "../middleware/validation.js";

dotenv.config();

const paymentsRoute = (postgresConnection) => {
    const router = express.Router();

    let paymentsService;

    const getPaymentsService = async () => {
        if (!paymentsService) {
            const module = await import("../service/PaymentsService.js");
            paymentsService = module.default(postgresConnection);
        }
        return paymentsService;
    };

    //create payment
    router.post("/create",
        authenticateToken,
        validator(schemaCreatePayment),
        expressAsyncHandler(async (req, res) => {
            const service = await getPaymentsService();
            const result = await service.createPayment(req.user.id, req.body);
            res.status(201).send(result);
        })
    );
    return router;
};
export default paymentsRoute;
