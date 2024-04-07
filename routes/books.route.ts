import express from "express";
// Importing the express library to create the router

import {
  createbook,
  deleteBook,
  editBook,
  getAllBooks,
  searchBookByAuthor,
  searchBookByISBN,
  searchBookByTitle,
  searchBookBycode,
} from "../controllers/books.controller";
// Importing the necessary controller functions for the routes

import { authorizeRoles, isAutheticated } from "../middleware/auth";
// Importing the authentication and authorization middleware

const bookRouter = express.Router();
// Creating a new router instance

// POST request to add a new book, restricted to Admin users
bookRouter.post(
  "/add-books",
  isAutheticated,
  authorizeRoles("Admin"),
  createbook
);

// PUT request to edit an existing book, restricted to Admin users
bookRouter.put(
  "/edit-books/:bookId",
  isAutheticated,
  authorizeRoles("Admin"),
  editBook
);

// GET request to search for books by title
bookRouter.get("/searchBookByTitle", searchBookByTitle);

// GET request to search for books by author
bookRouter.get("/searchBookByAuthor", searchBookByAuthor);

// GET request to search for books by ISBN
bookRouter.get("/searchBookByISBN", searchBookByISBN);

// GET request to search for books by code
bookRouter.get("/searchBookBycode", searchBookBycode);

// GET request to delete a book, restricted to Admin users
bookRouter.get(
  "/deleteBook",
  isAutheticated,
  authorizeRoles("Admin"),
  deleteBook
);

// GET request to retrieve all books
bookRouter.get("/allbooks", getAllBooks);

export default bookRouter;
// Exporting the router instance for use in other modules
