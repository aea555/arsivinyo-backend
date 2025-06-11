import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import limiter from "./lib/rateLimiter";
import tokenHandler from "./lib/tokenHandler";
import downloadHandler from "./lib/downloadHandler";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(helmet());

app.all("/download", (req, res, next) => {
  if (req.method !== "POST") {
    res.status(405).send("Only POST method is allowed for /download");
    return;
  }
  next();
});

app.post("/download", tokenHandler, limiter, downloadHandler);

app.all("*", (req, res) => {
  res.status(405).send("Method Not Allowed");
  return;
});