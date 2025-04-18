import express from "express";
import expressAsyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import config from "config";
import { validator } from "../middleware/validation.js";
import accountsService from "../service/AccountsService.js";
import dotenv from "dotenv";
import expressAsyncHandler from "express-async-handler";
import { authenticate, authorize } from "../middleware/auth.js";
import { validator } from "../middleware/validation.js";
import { schemaLogin } from "../validation/AccountSchemas.js";
import { schemaCourierAccount } from "../validation/CourierSchemas.js";

dotenv.config();

const couriersRoute = express.Router();

//addCourierAccount!
couriersRoute.post(
  "/post",
  validator(schemaCourierAccount),
  expressAsyncHandler(async (req, res) => {
    const courier = await courierService.addAccount(req.body);
    res.status(201).send(courier);
  })
);

//login
couriersRoute.post(
  "/login",
  validator(schemaLogin),
  expressAsyncHandler(async (req, res) => {
    const token = await courierService.login(req.body);
    res.status(201).send(token);
  })
);
export default couriersRoute;
