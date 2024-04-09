import { NextFunction, Response, Request } from "express";
import { catchAsyncError } from "../middleware/catchAsyncError";
import booksModel, { IBook } from "../models/books.model";
import ErrorHandler from "../utils/ErrorHandler";
import fs from "fs";

const bookNoFilePath = "./BookNo.txt";

async function generateBookNo(currentBookNo: string): Promise<string> {
  let bookNo: string;
  if (!fs.existsSync(bookNoFilePath)) {
    fs.writeFileSync(bookNoFilePath, "000000");
  }
  console;

  try {
    const data = await fs.promises.readFile(bookNoFilePath, "utf-8");
    const currentValue = data;
    if (currentBookNo) {
      const currentNumber = Number(currentBookNo.slice(-6));
      bookNo = String(currentNumber + 1).padStart(6, "0");
    } else {
      if (currentValue === data) {
        bookNo = String(currentValue + 1).padStart(6, "0");
      } else {
        throw new Error(
          "Current value in file and current book number do not match."
        );
      }
    }
  } catch (error: any) {
    if (error.code === "ENOENT") {
      bookNo = "000001";
    } else {
      throw error;
    }
  }
  return bookNo;
}

function generateAccessionCode(
  ddcClassification: string,
  author: string,
  book: string,
  volume: string,
  edition: number,
  copy: number,
  registerNumber: string
): string {
  const editionString = edition === 1 ? "" : `:${edition}`;
  const copyString = copy === 1 ? "" : `;${copy}`;
  const authorcode = author.substring(0, 3).toUpperCase();
  const bookCode = book.substring(0, 1).toUpperCase();
  return `${ddcClassification}.${authorcode}.${bookCode}.${volume}${editionString}${copyString}.${registerNumber}`;
}

export const createbook = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      if (data) {
        let bookvalue = await fs.promises.readFile(bookNoFilePath, "utf-8");

        let bookNo = await generateBookNo(bookvalue);
        let checkbookNo = await booksModel.findOne({
          bookId: bookNo,
          bookNo: bookNo,
        });
        while (checkbookNo) {
          bookNo = await generateBookNo(bookNo);
          checkbookNo = await booksModel.findOne({
            bookId: bookNo,
            bookNo: bookNo,
          });
        }
        data.accessionCode = generateAccessionCode(
          data.ddcClass,
          data.author,
          data.title,
          data.volume,
          data.edition,
          1,
          bookNo
        );
        data.bookId = bookNo;
        let totalcopies = 1;
        let availablecopies = 1;

        const newBook: IBook = {
          accessionCode: data.accessionCode,
          bookId: bookNo.toString().padStart(6, "0"), // pad to 6digit eg 000002,0000003 etc
          title: data.title,
          author: data.author,
          volume: data.volume,
          edition: data.edition,
          publishedYear: data.publishedYear,
          publisher: data.publisher,
          description: data.description,
          isbn: data.isbn,
          Pages: data.Pages,
          price: data.price,
          docType: data.docType,
          status: data.status,
          copies: [],
          reservedBy: "",
          totalcopies: totalcopies,
          availablecopies: availablecopies,
          borrowedcopies: totalcopies - availablecopies,
        };
        for (let i = 1; i < data.copy; i++) {
          bookNo = await generateBookNo(bookNo);
          newBook.copies.push({
            bookNo: bookNo,
            accessionCode: generateAccessionCode(
              data.ddcClass,
              data.author,
              data.title,
              data.volume,
              data.edition,
              i,
              bookNo
            ),
            reservedBy: "",
            status: "Available",
          });
          totalcopies++;
          availablecopies++;
          newBook.totalcopies = totalcopies;
          newBook.availablecopies = availablecopies;
          newBook.borrowedcopies = totalcopies - availablecopies;
        }

        const savedBook = await booksModel.create(newBook);
        await fs.promises.writeFile(bookNoFilePath, bookNo);

        res.status(201).json({
          status: "success",
          data: { savedBook },
        });
      } else {
        throw new ErrorHandler("No data provided", 400);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//edit the book
export const editBook = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bookId } = req.params;
      const data = req.body;
      if (data) {
        //remove the bookid and acceesionCode values from the data
        delete data.bookId;
        delete data.accessionCode;
        delete data.copy;
        const updatedBook = await booksModel.findByIdAndUpdate(
          bookId,
          { data },
          {
            new: true,
          }
        );
        res.status(200).json({
          status: "success",
          data: { updatedBook },
        });
      } else {
        throw new ErrorHandler("No data provided", 400);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//searchBook by title

//searchBook by title
export const searchBookByTitle = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title } = req.body;
      if (title) {
        const books = await booksModel.find({
          title: { $regex: `${title}`, $options: "i" },
        });
        if (books.length > 0) {
          res.status(200).json({
            status: "success",
            message: `${books.length} records Found`,
            results: books,
          });
        } else {
          res.status(400).json({
            status: "fail",
            message: "No books found",
          });
        }
      } else {
        throw new ErrorHandler("No Title provided", 400);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
export const searchBookByAuthor = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { author } = req.body;
      if (author) {
        const books = await booksModel.find({
          author: { $regex: `${author}`, $options: "i" },
        });
        if (books.length > 0) {
          res.status(200).json({
            status: "success",
            message: `${books.length} records Found`,
            results: books,
          });
        } else {
          res.status(400).json({
            status: "fail",
            message: "No Book by this author found",
          });
        }
      } else {
        throw new ErrorHandler("No Author provided", 400);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

export const searchBookByISBN = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { isbn } = req.body;
      if (isbn) {
        const books = await booksModel.find({
          isbn: { $regex: `${isbn}`, $options: "i" },
        });
        if (books.length > 0) {
          res.status(200).json({
            status: "success",
            message: `${books.length} records Found`,
            results: books,
          });
        } else {
          res.status(400).json({
            status: "fail",
            message: "No Book by this ISBN found",
          });
        }
      } else {
        throw new ErrorHandler("No ISBN provided", 400);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
export const searchBookBycode = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bookId } = req.body;
      if (bookId) {
        const book = await booksModel
          .findOne({ bookId: bookId })
          .populate("copies");
        if (book) {
          const books = [book, ...book.copies];
          if (books.length > 0) {
            res.status(200).json({
              status: "success",
              message: `${books.length} records Found`,
              results: books,
            });
          } else {
            res.status(400).json({
              status: "fail",
              message: "No Book by this Code found",
            });
          }
        } else {
          throw new ErrorHandler("No Book Code provided", 400);
        }
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//delete Books
export const deleteBook = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bookId } = req.body;
      const deletedBook = await booksModel.findOneAndDelete({ bookId: bookId });
      if (deletedBook) {
        res.status(200).json({
          status: "success",
          message: "Book deleted successfully",
        });
      } else {
        throw new ErrorHandler("Book not found", 400);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//Get all Books from DB
export const getAllBooks = catchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const books = await booksModel.find();
      if (books.length > 0) {
        res.status(200).json({
          status: "success",
          message: `${books.length} records Found`,
          results: books,
        });
      } else {
        res.status(400).json({
          status: "fail",
          message: "No books found",
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);
