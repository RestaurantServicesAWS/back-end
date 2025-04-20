import Joi from "joi";
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

export const schemaUpdOrderStatus = Joi.object({
    id: Joi.number()
        .integer()
        .positive()
        .required(),
    status: Joi.string()
        .valid('ORDER PICKED UP', 'ORDER DELIVERED')
        .required()
});


