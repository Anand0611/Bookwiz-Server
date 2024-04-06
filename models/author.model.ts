import mongoose, { Document } from "mongoose";

export interface IAuthor {
  name: string;
}
export interface IAuthorModel extends IAuthor, Document {}

const AuthorSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

export default mongoose.model<IAuthorModel>("Author", AuthorSchema);
