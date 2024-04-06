import { Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import BorrowModel from "../models/borrow.model";
import ErrorHandler from "../utils/ErrorHandler";
import userModel from "../models/user.model";

export const bookBorrow = CatchAsyncError(
  async (data: any, res: Response, next: NextFunction) => {
    try {
      const borrowedBook = await BorrowModel.create(data);
      res.status(201).json({ status: "success", data: { borrowedBook } });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// Get all Borrow
export const getAllUserBorrows = async (data: any, res: Response) => {
  // @ts-ignore
  const user = await userModel.findById(data.userId);
  const borrows = await BorrowModel.find({ user });
  if (!borrows)
    return res.status(404).json({ status: "fail", message: "No books found" });
  res.status(200).json({ status: "success", data: { borrows } });
};
