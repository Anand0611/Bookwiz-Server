import userModel from "../models/user.model";
import { Response, response } from "express";
import { redis } from "../utils/redis";

export const getUserById = async (id: string, res: Response) => {
  const userJSON = await redis.get(id);

  if (userJSON) {
    const user = JSON.parse(userJSON);
    res.status(200).json({
      success: true,
      user,
    });
  }
};
