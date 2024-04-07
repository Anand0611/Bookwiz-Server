import { NextFunction, Request, Response } from "express-serve-static-core";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import userModel from "../models/user.model";
import booksModel, { BookSchema } from "../models/books.model";
import BorrowModel, { generateborrowid } from "../models/borrow.model";

export const borrowBook = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { bookId, userId } = req.body;
    const currentDate = new Date();
    const dueDate = new Date(currentDate.getTime() + 20 * 24 * 60 * 60 * 1000);

    //find user and book detiails
    const user = await userModel.findOne({
      studentID: userId,
      staffID: userId,
    });
    const book = await booksModel.findOne({ bookId: bookId });
    const isbookavailable = book?.status === "available" ? true : false;
    const isuserverified = user?.isverified === true ? true : false;

    if (!isbookavailable) {
      res.status(400).json({
        status: "fail",
        message: "Book is not available",
      });
    } else if (!isuserverified) {
      res.status(400).json({
        status: "fail",
        message: "User is not verified",
      });
    } else if (user && user.noofBooks >= 5) {
      res.status(400).json({
        status: "fail",
        message: "User can't borrow more than 5 books",
      });
    } else if (user && book) {
      user.noofBooks = user.noofBooks + 1;
      book.status = "borrowed";
      book.availablecopies = book.availablecopies - 1;
      user.save();
      book.save();
      res.status(200).json({
        status: "success",
        message: "Book borrowed successfully",
      });
      const newBorrow = await BorrowModel.create({
        borrow_id: generateborrowid(),
        user_id: userId,
        book_id: bookId,
        book_title: book.title,
        borrow_date: currentDate,
        due_date: dueDate,
        fine_amount: 0,
        isReturned: false,
      });
      if (newBorrow) {
        res.status(200).json({
          status: "success",
          message: "Book borrowed successfully",
          results: newBorrow,
        });
      }
    }
  }
);
