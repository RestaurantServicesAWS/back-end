import Joi from "joi";
import config from "config";
import { joiPasswordExtendCore } from "joi-password";
const joiPassword = Joi.extend(joiPasswordExtendCore);
const schemaUser = Joi.string().email().required();

export const schemaGetAccount = Joi.object({
  email: schemaUser,
});

const nameSchema = Joi.string()
  .pattern(/^\S+\s\S+$/)
  .required();

const passwordSchema = joiPassword
  .string()
  .min(8)
  .minOfSpecialCharacters(1)
  .minOfLowercase(1)
  .minOfUppercase(1)
  .minOfNumeric(1)
  .noWhiteSpaces()
  .onlyLatinCharacters()
  .required();

export const schemaAccount = Joi.object({
  email: schemaUser,
  username: nameSchema,
  password: passwordSchema,
  role: Joi.string().valid(...config.get("accounting.roles")),
});

export const schemaPassowrd = Joi.object({
  email: schemaUser,
  password: passwordSchema,
});