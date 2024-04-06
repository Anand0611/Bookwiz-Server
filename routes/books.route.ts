import express from "express";
import { createbook, editBook, searchBookByAuthor, searchBookByISBN, searchBookByTitle, searchBookBycode } from "../controllers/books.controller";
import { authorizeRoles, isAutheticated } from "../middleware/auth";
const bookRouter = express.Router();

bookRouter.post(
  "/add-books",
  isAutheticated,
  authorizeRoles("Admin"),
  createbook
);
bookRouter.put(
  "/edit-books/:bookId",
  isAutheticated,
  authorizeRoles("Admin"),
  editBook
);
bookRouter.get(
  "/searchBookByTitle",
  searchBookByTitle
);
bookRouter.get(
  "/searchBookByAuthor",
  searchBookByAuthor
);
bookRouter.get(
  "/searchBookByISBN",
  searchBookByISBN
);
bookRouter.get(
  "/searchBookBycode",
  searchBookBycode
);



export default bookRouter;
