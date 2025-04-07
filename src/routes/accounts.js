import express from "express";
import asyncHandler from "express-async-handler";
import { validator } from "../middleware/validation.js";
import {
  schemaAccount,

  schemaPassowrd,
} from "../validation/AccountSchemas.js";
import accountingService from "../service/AccountsService.js";

const accountsRoute = express.Router();

//add user account
accountsRoute.post(
  "/user",
  validator(schemaAccount),
  asyncHandler(async (req, res) => {
    const account = await accountingService.addAccount(req.body);
    res.status(201).send(account);
  })
);

// add restaurant account
accountsRoute.post(
  "/restaurant",
  validator(schemaAccount),
  asyncHandler(async (req, res) => {
    const account = await accountingService.addAccount(req.body);
    res.status(201).send(account);
  })
);

// add courier account
accountsRoute.post(
  "/courier",
  validator(schemaAccount),
  asyncHandler(async (req, res) => {
    const account = await accountingService.addAccount(req.body);
    res.status(201).send(account);
  })
);



// update password
accountsRoute.put(
  "/",
  validator(schemaPassowrd),
  asyncHandler(async (req, res) => {
    await accountingService.updatePassword(req.body);
    res.send("account updated");
  })
);

// get account by email
accountsRoute.get(
  "/:email",
  asyncHandler(async (req, res) => {
    const account = await accountingService.getAccount(req.params.email);
    res.status(200).send(account);
  })
);

// block / unblock  account
accountsRoute.put(
  "/:action(block|unblock)/:email",
  asyncHandler(async (req, res) => {
    const isBlocked = req.params.action === "block";
    await accountingService.setAccountBlockStatus(req.params.email, isBlocked);
    res.status(200).send(`account ${isBlocked ? "blocked" : "unblocked"}`);
  })
);

// delete account
accountsRoute.delete(
  "/:email",
  asyncHandler(async (req, res) => {
    await accountingService.delete(req.params.email);
    res.status(200).send("deleted");
  })
);

// login
accountsRoute.post(
  "/login",
  asyncHandler(async (req, res) => {
    const token = await accountingService.login(req.body);
    res.send(token);
  })
);
export default accountsRoute;
