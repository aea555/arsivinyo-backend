import { NextFunction, Request, Response } from "express";

export default async function tokenHandler(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["authorization"];
  if (token !== `Bearer ${process.env.AUTH_TOKEN}`) {
    if (process.env.NODE_ENV !== "production") {
      console.error("token bulunamadı veya yanlış !");
    }
    res.status(403).send("Unauthorized");
    return;
  }
  next();
}