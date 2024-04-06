import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, {JwtPayload}  from "jsonwebtoken";
import { redis } from "../utils/redis";
import userModel from "../models/user.model";


// Autheticated User
export const isAutheticated = CatchAsyncError(async(req:Request,res:Response,next:NextFunction) => {
    const asccess_token = req.cookies.access_token as string;
    if(!asccess_token) {
        return next(new ErrorHandler("Please Login to Access this resource",400));
}

const decoded = jwt.verify(asccess_token,process.env.ACCESS_TOKEN as string) as JwtPayload;

if(!decoded) {
    return next(new ErrorHandler("Access Token is not valid",400));
}

const user = await redis.get(decoded.id);

if (!user) {
    return next(new ErrorHandler("User Not Found",400));
}

req.user = JSON.parse(user);
next();
});

//validate user role

export const authorizeRoles = (...roles: string[]) => {
   return function(req:Request, res:Response ,next:NextFunction){
    if (!roles.includes(req.user?.role || '')) {
        return next(new ErrorHandler(`Roles: ${req.user?.role} is not allowed to access this resource`,403));
    }
    next();
}
}


export const validateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
       const userId = req.user?._id;
       const user = await userModel.findById(userId);

    if (!user?.isverified) {
      return next(new ErrorHandler("User is not validated", 400));
    }

    next();
  }
);
