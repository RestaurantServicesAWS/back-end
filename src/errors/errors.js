export function createError(status, message) {
    const error = new Error(message); 
    error.status = status; 
    return error;
  }
  
  export function errorHandler(error, req, res, next) {
    const status = error.status ?? 500;
    const message = error.message ?? "Internal server error";
    res.status(status).send(message);
  }