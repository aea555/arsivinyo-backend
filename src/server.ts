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
const isTermux = process.env.TERMUX === "true";

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

if (isTermux) {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running in Termux on 0.0.0.0:${PORT}`);
  });
} else {
  app.listen(Number(PORT), () => {
    console.log(`Server running locally on port ${PORT}`);
  });
}