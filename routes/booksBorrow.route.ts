import express from "express";
import { isAutheticated } from "../middleware/auth";
import {
  borrowBook,
} from "../controllers/bookBorrow.controller";
import { bookBorrow } from "../services/borrow.service";


const borrowRouter = express.Router();

borrowRouter.post("/borrow_book", isAutheticated, borrowBook);
// borrowRouter.get("/viewborrow", isAutheticated, getUserBorrows);

export default borrowRouter;
