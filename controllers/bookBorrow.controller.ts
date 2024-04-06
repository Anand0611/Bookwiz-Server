import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import { bookBorrow, getAllUserBorrows } from "../services/borrow.service";
import BookModel from "../models/books.model";

export const borrowBook = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      console.log(data);
    
      const book = await BookModel.findById({ book_id: data.bookId });

      if (data) {
        if (book && book.available_copies > 0) {
          bookBorrow(data, res, next);
          res.status(201).json({
            status: "success",
            message: "Successfully Borrowed",
            data: data,
          });
        } else {
          throw new ErrorHandler("This book is not available", 409);
        }
      }
      if (book) {
        book.borrowed_copies++;
        book.available_copies--;
        await book?.save();
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const getUserBorrows = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      if (data.user_id) {
        getAllUserBorrows(data.user_id, res);
      }
      res.status(200).json({
        status: "success",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
