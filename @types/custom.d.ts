import { Request, Response, NextFunction } from "express";
import { Iuser } from "../models/user.model";
import { IBook } from "../models/books.model";

declare global {
  namespace Express {
    interface Request {
      user?: Iuser;
      book?: IBook;
    }
  }
}
