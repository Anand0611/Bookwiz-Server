// interface for book detials

import mongoose, { Model, Schema } from "mongoose";

export interface IBook {
  bookId: string;
  accessionCode: string;
  title: string;
  author: string;
  volume: number;
  edition: number;
  publishedYear: number;
  publisher: string;
  description: string;
  isbn: string;
  Pages: number;
  price: number;
  docType: string;
  copies: ICopy[];
  totalcopies: number;
  availablecopies: number;
  borrowedcopies: number;
}

export interface ICopy {
  bookNo: string;
  accessionCode: string;
}

export const BookSchema: Schema = new Schema({
  bookId: { type: String, required: false, unique: true },
  accessionCode: { type: String, required: false, unique: true },
  title: { type: String, required: false },
  author: { type: String, required: false },
  volume: { type: Number, required: false },
  edition: { type: Number, required: false },
  publishedYear: { type: Number, required: false },
  publisher: { type: String, required: false },
  description: { type: String, required: false },
  isbn: { type: String, required: false, unique: true },
  Pages: { type: Number, required: false },
  price: { type: Number, required: false },
  docType: { type: String, required: false },
  copies: [
    {
      bookNo: { type: String, required: false, unique: true },
      accessionCode: { type: String, required: false, unique: true },
    },
  ],
  totalcopies: { type: Number, required: false },
  availablecopies: { type: Number, required: false },
  borrowedcopies: { type: Number, required: false },
});

export interface IBookModel extends Model<IBook>{
  findByTitle(title: string) : Promise<IBook[]>;
  findByAuthor(author: string) : Promise<IBook[]>;
  updateBook(book: IBook) : Promise<IBook[]>;
  deleteBook(id: string) : Promise<IBook[]>;
}
export default mongoose.model<IBook>("Book", BookSchema);
