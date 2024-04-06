require("dotenv").config();
import express, { NextFunction, Request, Response } from "express";
export const app = express();
import cors from "cors";
import cookieParser from "cookie-parser";
import { ErrorMiddleware } from "./middleware/error";
import userRouter from "./routes/user.route";
import bookRouter from "./routes/books.route";
import borrowRouter from "./routes/booksBorrow.route";

//body parser
app.use(express.json({ limit: "50mb" }));

//cookie parser
app.use(cookieParser());

//cors => Cross orgin resource sharing
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// routes
app.use("/api/v1", userRouter);
app.use("/api/v1", bookRouter);
app.use("/api/v1", borrowRouter);

//testing api
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    success: true,
    message: "API is Working",
  });
});

//unknown route
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`Route ${req.originalUrl} not found`) as any;
  err.statusCode = 404;
  next(err);
});

app.use(ErrorMiddleware);
