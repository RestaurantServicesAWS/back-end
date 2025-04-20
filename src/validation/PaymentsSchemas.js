import Joi from "joi";

export const schemaCreatePayment = Joi.object({
    orderId: Joi.number().integer().positive().required()
});