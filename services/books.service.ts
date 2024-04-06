import { Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import bookModel from "../models/books.model";

export const createBook = CatchAsyncError(async (data: any, res: Response) => {
  const book = await bookModel.create(data);
  res.status(201).json({
    status: "success",
    data: { book },
  });
});
// Get all books or a single book by id

//create a getAllBook() to return all the books present in the db
const getAllBooks = async () => {
  const books = await bookModel.find();
  return books;
};

export const getBooks = async (data:any, res:Response) => {
  if (data.params.id) {
    const book = await bookModel.findById(data.params.id);
    return res.status(200).json({
      status: "success",
      data: { book },
    });
  } else {
    const books = getAllBooks();
    return res.status(200).json({
      status: "success",
      results: books,
    });
  }
};
