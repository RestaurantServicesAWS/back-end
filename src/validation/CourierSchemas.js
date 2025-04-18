import Joi from "joi";
import config from "config";
import { joiPasswordExtendCore } from "joi-password";
import { passwordSchema, nameSchema, phoneSchema } from "./AccountSchemas.js";
const joiPassword = Joi.extend(joiPasswordExtendCore);
const schemaUser = Joi.string().email().required();

export const schemaCourierAccount = Joi.object({
  email: schemaUser,
  password: passwordSchema,
  name: nameSchema,
  phone: phoneSchema,
});

export const schemaGetAccount = Joi.object({
  email: schemaUser,
});

const nameSchema = Joi.string()
  .pattern(/^\S+\s\S+$/)
  .required();

export const schemaAccount = Joi.object({
  email: schemaUser,
  username: nameSchema,
  password: passwordSchema,
  role: Joi.string().valid(...config.get("accounting.roles")),
});
