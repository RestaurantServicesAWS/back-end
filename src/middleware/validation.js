import { createError } from "../errors/errors.js";
export function expressValidator(schemasObj) {
  return (req, res, next) => {
    if (req._body) {
      const { error } = schemasObj[req.method].validate(req.body, {
        abortEarly: false,
      });
      if (error) {
        req.errorMessage = error.details.map((d) => d.message).join(";");
      }
      req.validated = true;
    }
    next();
  };
}
export function validator(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      throw createError(400, error.details.map((d) => d.message).join(";"));
    }
    next();
  };
}
export function valid(req, res, next) {
  if (!req.validated) {
    throw createError(500, "server has not validated request");
  }
  if (req.errorMessage) {
    throw createError(400, req.errorMessage);
  }
  next();
}

export const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).send({ error: "Authorization token required" });
  }

  try {
    const decoded = jwt.verify(token, config.get("jwt.secret"));
    req.user = decoded;
    next();
  } catch {
    res.status(403).send({ error: "Invalid or expired token" });
  }
};
