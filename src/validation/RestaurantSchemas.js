import Joi from 'joi';

export const schemaDish = Joi.object({
  restaurant_id: Joi.number().required(),
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
  price: Joi.number().positive().required(),
});

export const schemaOrder = Joi.object({
  restaurant_id: Joi.number().required(),
  user_id: Joi.number().required(),
  items: Joi.array().items(
    Joi.object({
      dish_id: Joi.number().required(),
      quantity: Joi.number().positive().required(),
    })
  ).required(),
  cooking_time: Joi.number().positive().required(),
});