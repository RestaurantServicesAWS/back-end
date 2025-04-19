import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { validator } from '../middleware/validation.js';
import dotenv from "dotenv";
import { authenticateToken } from "../middleware/validation.js";
import { schemaLogin } from "../validation/AccountSchemas.js"
import { schemaCourierAccount, schemaUpdOrderStatus } from "../validation/CourierSchemas.js"

dotenv.config();

const couriersRoute = (postgresConnection) => {
    const router = express.Router();

    let couriersService;

    const getCouriersService = async () => {
        if (!couriersService) {
            const module = await import("../service/CouriersService.js");
            couriersService = module.default(postgresConnection);
        }
        return couriersService;
    };

    //addCourierAccount
    router.post("/register",
        validator(schemaCourierAccount),
        expressAsyncHandler(async (req, res) => {
            const service = await getCouriersService();
            const courier = await service.addAccount(req.body);
            res.status(201).send(courier);
        })
    );

    //login
    router.post("/login",
        validator(schemaLogin),
        expressAsyncHandler(async (req, res) => {
            const service = await getCouriersService();
            const token = await service.login(req.body);
            res.status(201).send(token);
        }));

    //changing work status - available or not
    router.put("/",
        authenticateToken,
        expressAsyncHandler(async (req, res) => {
            const service = await getCouriersService();
            const status = await service.changeWorkStatus(req.user.id);
            const msg = status ? "started" : "ended";
            res.status(201).send(`You ${msg} your shift.`);
        }));

    //get all my orders
    router.get("/orders/all",
        authenticateToken,
        expressAsyncHandler(async (req, res) => {
            const service = await getCouriersService();
            const orders = await service.getCouriersOrders(req.user.id);
            res.status(201).send(orders);
        }));

    //mark by order's id - ORDER PICKED UP, ORDER DELIVERED
    router.put("/orders/update",
        authenticateToken,
        validator(schemaUpdOrderStatus),
        expressAsyncHandler(async (req, res) => {
            const service = await getCouriersService();
            const order = await service.changeOrderStatus(req.user.id, req.body);
            res.status(201).send(order);
        }));
    return router;
};
export default couriersRoute;
