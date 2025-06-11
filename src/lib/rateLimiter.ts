import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later.",
});

export default limiter;