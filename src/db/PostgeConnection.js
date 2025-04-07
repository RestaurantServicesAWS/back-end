import { MongoClient } from "mongodb";
import config from "config";
import  logger  from "../logger/winstonLogging.js";

const { MONGO_CONNECTION, MONGO_PASSWORD, MONGO_CLUSTER } = process.env;

class MongoConnection {
  #client;
  #db;
  constructor(connectionStr, dbName) {
    this.#client = new MongoClient(connectionStr);
    this.#db = this.#client.db(dbName);
  }

  getCollection(collectionName) {
    return this.#db.collection(collectionName);
  }

  async close() {
    try {
      await this.#client.close();
      logger.info("MongoDB connection closed seccessfully");
    } catch (error) {
      logger.error("MongoDB connection close failed", error);
      throw error
    }
  }
}

const dbName = config.get("db.db_name");
const connectionStr = `${MONGO_CONNECTION}:${MONGO_PASSWORD}@${MONGO_CLUSTER}`;
const mongoConnection = new MongoConnection(connectionStr, dbName);

export default mongoConnection;