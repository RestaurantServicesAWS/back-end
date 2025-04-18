import Joi from "joi";
import config from "config";
import { joiPasswordExtendCore } from "joi-password";
const joiPassword = Joi.extend(joiPasswordExtendCore);
const schemaUser = Joi.string().email().required();

export const schemaGetAccount = Joi.object({
  email: schemaUser,
});

export const nameSchema = Joi.string()
  .pattern(/^\S+\s\S+$/)
  .required();

export const passwordSchema = joiPassword
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
  name: nameSchema, 
  password: passwordSchema,
  city: Joi.string().required(),
  street: Joi.string().required(),
  building: Joi.string().required(),
  flat: Joi.string().optional(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{7,14}$/)
    .required(),
});

export const schemaPassword = Joi.object({
  email: schemaUser,
  password: passwordSchema,
});

export const schemaLogin = Joi.object({
  email: schemaUser,
  password: passwordSchema,
});

export const phoneSchema = Joi.string()
  .pattern(/^\+?[1-9]\d{7,14}$/)
  .required();
