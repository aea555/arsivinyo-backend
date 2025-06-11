import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import limiter from "./lib/rateLimiter.js";
import tokenHandler from "./lib/tokenHandler.js";
import downloadHandler from "./lib/downloadHandler.js";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);
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

app.all(/(.*)/, (req, res) => {
  res.status(405).send("Method Not Allowed");
  return;
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});