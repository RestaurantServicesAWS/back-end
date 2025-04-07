import express from "express";
import accountsRoute from "../routes/accounts.js";
import errorHandler from "../errors/errors.js";
const app = express();
const port = process.env.PORT || 3500;

app.use(express.json());


app.use("/accounts", accountsRoute);

app.use((req, res) => {
    res.status(404).send(`path ${req.path} is not found`);
  });
  app.listen(port, () =>
    console.log(`server is listening on port ${port}`)
  );
  app.use(errorHandler);