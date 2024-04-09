import { NextFunction, Request, Response } from "express-serve-static-core";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import userModel from "../models/user.model";
import booksModel, { BookSchema } from "../models/books.model";
import BorrowModel, { generateborrowid } from "../models/borrow.model";
import ErrorHandler from "../utils/ErrorHandler";

export const borrowBook = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bookId, userId } = req.body;
      const currentDate = new Date();
      const dueDate = new Date(
        currentDate.getTime() + 20 * 24 * 60 * 60 * 1000
      );

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
        const maxFine: Number = 300;
        if (user.Fineamnt > maxFine) {
          res.status(400).json({
            status: "fail",
            message:
              "User's fine amount cannot be more than 300. Please Pay your fine to borrow new book",
          });
        }
        user.save();
        book.save();

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
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const getAllBorrowedBooks = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const borrowedBooks = await BorrowModel.find();
      if (borrowedBooks) {
        res.status(200).json({
          status: "success",
          message: `No of Records Found ${borrowedBooks.length}`,
          results: borrowedBooks,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
export const getUnreturnedBooks = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const borrowedBooks = await BorrowModel.find({ isReturned: false });
      if (borrowedBooks) {
        res.status(200).json({
          status: "success",
          message: `No of Unreturned Records Found ${borrowedBooks.length}`,
          results: borrowedBooks,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
export const getReturnedBooks = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const borrowedBooks = await BorrowModel.find({ isReturned: true });
      if (borrowedBooks) {
        res.status(200).json({
          status: "success",
          message: `No of Returned Records Found ${borrowedBooks.length}`,
          results: borrowedBooks,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//book return
export const returnBook = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { bookid } = req.body;
    const returnDate = new Date();
    const bookBorrow = await BorrowModel.findOne({ book_id: bookid });
    if (bookBorrow) {
      bookBorrow.isReturned = true;
      if (returnDate < bookBorrow.due_date) {
        return res.status(200).json({
          status: "success",
          message: "Book returned on time",
        });
      }
      const difference = returnDate.getTime() - bookBorrow.due_date.getTime();
      const daysDifference = Math.ceil(difference / (1000 * 3600 * 24));
      let fine = 0;
      if (daysDifference > 0) {
        if (daysDifference <= 10) {
          fine = 2 * daysDifference;
        } else if (daysDifference > 10 && daysDifference <= 20) {
          fine = 5 * (daysDifference - 10);
        } else {
          fine = 10 * (daysDifference - 20);
        }
      }
      bookBorrow.fine_amount = fine;

      await bookBorrow.save();
      res.status(200).json({
        status: "success",
        message: "Book returned successfully",
      });
    }
  }
);

// get all borrowed books by user id

export const getBorrowedBooksByUserId = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.query;
    const borrowedBooks = await BorrowModel.find({
      user_id: userId,
      isReturned: false,
    });
    if (borrowedBooks) {
      res.status(200).json({
        status: "success",
        message: `No of borrowed Records Found ${borrowedBooks.length}`,
        results: borrowedBooks,
      });
    }
  }
);

export const renewBook = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { bookId, userId } = req.body;
    const currentDate = new Date();
    const dueDate = new Date(currentDate.getTime() + 20 * 24 * 60 * 60 * 1000);

    const bookBorrow = await BorrowModel.findOne({
      book_id: bookId,
      user_id: userId,
      isReturned: false,
    });

    if (
      bookBorrow &&
      bookBorrow.due_date >= currentDate &&
      bookBorrow.renew_count <= 2
    ) {
      bookBorrow.due_date = dueDate;
      bookBorrow.fine_amount = 0;
      bookBorrow.renew_count = bookBorrow.renew_count + 1;

      await bookBorrow.save();

      res.status(200).json({
        status: "success",
        message: "Book renewed successfully",
      });
    } else if (bookBorrow && bookBorrow.due_date < currentDate) {
      res.status(400).json({
        status: "fail",
        message: "Please return the book. Due date has passed",
      });
    } else if (bookBorrow && bookBorrow.renew_count > 2) {
      res.status(400).json({
        status: "fail",
        message: "Renewal limit exceeded. Book cannot be renewed",
      });
    } else {
      res.status(404).json({
        status: "fail",
        message: "Book not found or already returned",
      });
    }
  }
);

export const reserveBook = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const { bookId, userId } = req.body;

    try {
      const book = await booksModel.findById(bookId);

      if (!book) {
        return res.status(404).json({
          status: "fail",
          message: "Book not found",
        });
      }

      if (book.status === "reserved" && book.reservedBy !== userId) {
        return res.status(400).json({
          status: "fail",
          message: "Book is already reserved by someone else",
        });
      }

      if (book.availablecopies === 0) {
        book.reservedBy = userId;
        await book.save();
        return res.status(200).json({
          status: "success",
          message: "Book reserved successfully",
        });
      }

      return res.status(400).json({
        status: "fail",
        message: "Book is not available for reservation",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
