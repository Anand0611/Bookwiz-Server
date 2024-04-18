require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import userModel, { Iuser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import jwt, { Secret } from "jsonwebtoken";
import ejs from "ejs";
import sendMail from "../utils/sendMail";
import path from "path";
import { redis } from "../utils/redis";
import { JwtPayload } from "jsonwebtoken";
import {
  accessTokenOptions,
  sendToken,
  refreshTokenOptions,
} from "../utils/jwt";
import { getUserById } from "../services/user.service";
import cloudinary from "cloudinary";
import mongoose from "mongoose";

//register user
interface IRegistrationBody {
  firstName: string;
  email: string;
  password: string;
}

/**
 * Registers a new user.
 *
 * 1. Validates user input.
 * 2. Checks if email already exists.
 * 3. Creates user object.
 * 4. Generates activation token.
 * 5. Sends activation email.
 * 6. Returns response with activation token.
 */
export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, email, password } = req.body;

      const isEmailExist = await userModel.findOne({ email });
      if (isEmailExist) {
        return next(new ErrorHandler("Email is already exist", 400));
      }

      const user: IRegistrationBody = {
        firstName,
        email,
        password,
      };

      const activationToken = createActivationToken(user);

      const activationCode = activationToken.activationCode;

      const data = { user: { name: user.firstName }, activationCode };
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activation-mail.ejs"),
        data
      );

      try {
        await sendMail({
          email: user.email,
          subject: "Activate your account",
          template: "activation-mail.ejs",
          data,
        });

        res.status(201).json({
          success: true,
          message: `Please check your email : ${user.email} to activate your account!`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}
export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    {
      user,

      activationCode,
    },
    process.env.ACTIVATION_SECRET as Secret,
    {
      expiresIn: "5m",
    }
  );

  return { token, activationCode };
};

//activate user
interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } =
        req.body as IActivationRequest;

      const newUser: { user: Iuser; activationCode: string } = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string
      ) as { user: Iuser; activationCode: string };

      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }
      const { firstName, email, password, isverified } = newUser.user;

      const existUser = await userModel.findOne({ email });

      if (existUser) {
        return next(new ErrorHandler("Email is already in use.", 400));
      }

      const user = await userModel.create({
        firstName,
        email,
        password,
        isverified: true,
      });

      res.status(201).json({
        success: true,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//Login User
interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as ILoginRequest;
      // console.log(email, password);

      if (!email || !password) {
        return next(new ErrorHandler("Please provide email and password", 400));
      }

      const user = await userModel.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("Invalid Email or Password", 400));
      }

      const isPasswordMatch = await user.comparePassword(password);

      if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid Password", 400));
      }

      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//Logout user

export const logoutUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("access_token", "", { maxAge: 1 });
      res.cookie("refresh_token", "", { maxAge: 1 });
      const userId = req.user?._id || "";
      redis.del(userId);
      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update access token

export const updateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refresh_token as string;
      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_TOKEN as string
      ) as JwtPayload;

      const message = "Could not refresh token";
      if (!decoded) {
        return next(new ErrorHandler(message, 400));
      }
      let session = await redis.get(decoded.id as string);

      if (!session) {
        return next(new ErrorHandler(message, 400));
      }

      const user = JSON.parse(session);

      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_TOKEN as string,
        { expiresIn: "3d" }
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN as string,
        { expiresIn: "3d" }
      );

      req.user = user;

      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);

      res.status(200).json({
        success: "success",
        accessToken,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//get user info
export const getUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      getUserById(userId, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface ISocialUser {
  email: string;
  firstName: string;
  avatar: string;
}

//social auth
export const socialAuth = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, firstName, avatar } = req.body as ISocialUser;
      const user = await userModel.findOne({ email });
      if (!user) {
        const newUser = await userModel.create({ email, firstName, avatar });
        sendToken(newUser, 200, res);
      } else {
        sendToken(user, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//complete user profile
interface userProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: {
    public_id: string;
    url: string;
  };
  address?: string;
  phone_No?: string;
  locality?: string;
  state?: string;
  country?: string;
  pin?: string;
  dateOfBirth: Date;
  UserType: string;
  studentID: string;
  course: string;
  isAdmin: boolean;
  isProfileUpdated: boolean;
  department: string;
  joinDate: Date;
  designation: string;
}

export function generateStudentId(course: string): string {
  // implementation to generate student id
  let studentId = "";
  course = course.toUpperCase();
  studentId += course + new Date().getFullYear();

  const randomNumber = Math.floor(Math.random() * 90000) + 10000;
  studentId += randomNumber;

  return studentId;
}
export function generateStaffId(): string {
  // implementation to generate student id
  let staffID = "";
  const deptcode = "STAFF";
  staffID += deptcode + new Date().getFullYear();

  const randomNumber = Math.floor(Math.random() * 90000) + 10000;
  staffID += randomNumber;

  return staffID;
}

export const completeProfile = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        firstName,
        lastName,
        email,
        avatar,
        address,
        phone_No,
        locality,
        state,
        country,
        pin,
        dateOfBirth,
        UserType,
        isAdmin,
        isProfileUpdated,
        course,
        department,
        designation,
        joinDate,
      } = req.body as userProfile;
      const user = await userModel.findOne({ email: email });
      const userid = user?._id;
      // console.log(userid);
      // console.log(req.body);

      if (firstName && user) {
        user.firstName = firstName;
      }
      if (lastName && user) {
        user.lastName = lastName;
      }

      if (email && user) {
        const isEmailExist = await userModel.findOne({ email: email });
        if (isEmailExist) {
          user.email = email;
        }
        user.email = email;
      }
      if (isAdmin && user) {
        user.role = "Admin";
      }
      if (isProfileUpdated && user) {
        user.isProfileUpdated = true;
      }
      if (avatar && user) {
        user.avatar.public_id = avatar.public_id;
        user.avatar.url = avatar.url;
      }
      if (address && user) {
        user.address = address;
      }
      if (phone_No && user) {
        user.phone_no = phone_No;
      }
      if (locality && user) {
        user.locality = locality;
      }
      if (state && user) {
        user.state = state;
      }
      if (country && user) {
        user.country = country;
      }
      if (pin && user) {
        user.pincode = pin;
      }

      if (dateOfBirth && user) {
        user.dateOfBirth = dateOfBirth;
      }

      if (user && UserType === "Student") {
        if (user.studentID === undefined) {
          let id = generateStudentId(course);
          let Student = await userModel.findOne({ studentID: id });
          while (Student) {
            id = generateStudentId(course);
            Student = await userModel.findOne({ studentID: id });
          }
          user.studentID = id;
        }
        if (user.isProfileUpdated === false) {
          user.course = course;
          user.department = department;
          user.joinDate = joinDate;
        }
      }

      if (user && UserType === "Staff") {
        // console.log(user.staffID);
        if (user.staffID == undefined) {
          let id = generateStaffId();
          let Staff = await userModel.findOne({ staffID: id });
          while (Staff) {
            id = generateStaffId();
            Staff = await userModel.findOne({ staffID: id });
          }
          user.staffID = id;
          // console.log(id);
        }
        if (user.isProfileUpdated === false) {
          user.designation = designation;
          user.department = department;
          user.joinDate = joinDate;
        }
      }
      console.log(user);
      await user?.save();
      await redis.set(userid, JSON.stringify(user));

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update user password
interface IUpdatePassword {
  password: string;
  newPassword: string;
}

export const updatePassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { password, newPassword } = req.body as IUpdatePassword;
      const user = await userModel.findById(req.user?._id).select("+password");

      if (user?.password === undefined) {
        return next(new ErrorHandler("User does not exist", 400));
      }

      if (password === newPassword) {
        return next(
          new ErrorHandler("New password cannot be same as old password", 400)
        );
      }
      const isPasswordMatch = await user.comparePassword(password);

      if (!isPasswordMatch) {
        return next(new ErrorHandler("Old Password is incorrect", 400));
      }

      user.password = newPassword;
      await user.save();
      await redis.set(req.user?._id, JSON.stringify(user));
      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//update profile picture

interface IUpdateProfilePicture {
  avatar: string;
}

export const updateProfilePicture = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body as IUpdateProfilePicture;
      const userid = req.user?._id;

      const user = await userModel.findById(userid);
      // check if the user and profile image exist
      if (avatar && user) {
        // check if the user has a profile image
        if (user?.avatar?.public_id) {
          // delete the previous profile image
          await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
          // upload the new image.
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "bookwiz/profile",
            width: 150,
          });
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        } else {
          // upload the new image.
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "bookwiz/profile",
            width: 150,
          });
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        }
      }

      await user?.save();
      await redis.set(userid, JSON.stringify(user));

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//make admin

interface ImakeAdmin {
  adminCode: string;
}
export const makeUserAdmin = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { adminCode } = req.body as ImakeAdmin;
      const user_id = req.user?._id;

      const user = await userModel.findById(user_id);

      if (user) {
        if (adminCode === process.env.ADMIN_CODE) {
          user.role = "Admin";
          await user.save();
          await redis.set(user_id, JSON.stringify(user));
          res.status(200).json({
            success: true,
            user,
          });
        } else {
          return next(new ErrorHandler("Invalid Admin Code", 400));
        }
      } else {
        return next(new ErrorHandler("User does not exist", 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler("Unable to make user admin", 500));
    }
  }
);
