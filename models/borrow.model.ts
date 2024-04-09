import mongoose, { Document, Schema, Model } from "mongoose";
import BookModel from "./books.model";

export interface IbookBorrow extends Document {
  borrow_id: string;
  user_id: string;
  book_id: string;
  book_title: string;
  borrow_date: Date;
  renew_count: number;
  due_date: Date;
  fine_amount: number;
  isReturned: boolean;
}

export async function generateborrowid(): Promise<string> {
  //get the number of records in the borrow db
  const count = await BorrowModel.estimatedDocumentCount();
  const currentYear = new Date().getFullYear();
  const Year2Digit = currentYear.toString().slice(-2);
  const borrowid =
    "B" + "." + String(Year2Digit) + ":" + String(count).padStart(6, "0");

  return borrowid;
}

const bookBorrowSchema = new Schema<IbookBorrow>({
  borrow_id: { type: String, required: true },
  user_id: { type: String, required: true },
  book_id: { type: String, required: true },
  book_title: { type: String, required: false },
  borrow_date: { type: Date, default: Date.now() },
  renew_count: { type: Number, default: 0 },
  due_date: {
    type: Date,
    default: () => Date.now() + 10 * 24 * 60 * 60 * 1000 /*10 days*/,
  },
  fine_amount: { type: Number, default: 0 },
  isReturned: { type: Boolean, default: false },
});

bookBorrowSchema.pre("save", async function (next) {
  if (!this.borrow_id) {
    this.borrow_id = generateborrowid().toString();
  }
  if (!this.user_id) {
    throw new Error("User id must be provided");
  }
  if (!this.book_id) {
    throw new Error("Book id must be provided");
  }

  const book = await BookModel.findById(this.book_id);

  if (!book) {
    throw new Error("Book not found");
  }
  if (book.availablecopies < 1) {
    throw new Error("Book not available");
  }
});

const BorrowModel: Model<IbookBorrow> = mongoose.model(
  "Borrow",
  bookBorrowSchema
);

export default BorrowModel;
