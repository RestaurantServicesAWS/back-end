import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { validator } from '../middleware/validation.js';
import dotenv from "dotenv";
import { authenticate } from "../middleware/auth.js";
import { schemaLogin } from "../validation/AccountSchemas.js"
import {schemaCourierAccount, schemaUpdOrderStatus} from "../validation/CourierSchemas.js"
import couriersService from '../service/CouriersService.js';

dotenv.config();

const couriersRoute = express.Router();

//addCourierAccount!
couriersRoute.post("/post", validator(schemaCourierAccount), expressAsyncHandler(async (req, res) => {
    const courier = await couriersService.addAccount(req.body);
    res.status(201).send(courier);
}));

//login
couriersRoute.post("/login", validator(schemaLogin), expressAsyncHandler(async (req, res) => {
    const token = await couriersService.login(req.body);
    res.status(201).send(token);
}));

//changing work status - available or not
couriersRoute.put("/", authenticate, expressAsyncHandler(async (req, res) => {
    const status = await couriersService.changeWorkStatus(req.user._id);
    res.status(201).send(`Now your status: ${status}`);
}));

//get all my orders
couriersRoute.get("/orders/all", authenticate, expressAsyncHandler(async (req, res) => {
    const orders = await couriersService.getCouriersOrders(req.user._id);
    res.status(201).send(orders);
}));

//mark by order's id - ORDER PICKED UP, ORDER DELIVERED
couriersRoute.put("/orders/update", authenticate, validator(schemaUpdOrderStatus), expressAsyncHandler(async (req, res) => {
    const order = await couriersService.changeOrderStatus(req.user._id, req.body);
    res.status(201).send(order);
}));
export default couriersRoute;