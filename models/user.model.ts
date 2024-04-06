require("dotenv").config();
import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const emailRegrexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface Iuser extends Document {
  user_id: string;
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  password: string;
  avatar: {
    public_id: string;
    url: string;
  };
  role: string;
  phone_no: string;
  locality: string;
  state: string;
  country: string;
  pincode: string;
  dateOfBirth: Date;

  joinDate: Date;
  studentID: String;
  course: String;
  department: String;
  staffID: String;
  designation: String;

  isverified: boolean;
  isMember: boolean;
  Fineamnt: Number;
  comparePassword: (password: string) => Promise<boolean>;
  SignAccessToken: () => string;
  SignRefreshToken: () => string;
}

const userSchema: Schema<Iuser> = new mongoose.Schema(
  {
    user_id: {
      type: String,
      unique: true,
    },
    firstName: {
      type: String,
      required: [true, "Please enter your First Name"],
    },
    lastName: {
      type: String,
    },
    email: {
      type: String,
      required: [true, "Please enter your Email"],
      unique: true,
      validate: {
        validator: function (value: string) {
          return emailRegrexPattern.test(value);
        },
        message: "Please enter a valid Email",
      },
    },
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      // select: false,
    },
    avatar: {
      public_id: String,
      url: String,
    },
    role: {
      type: String,
      default: "user",
    },
    phone_no: {
      type: String,
      minlength: [10, "Please enter a 10 digit mobile number"],
    },
    address: {
      type: String,
    },
    locality: {
      type: String,
    },
    state: {
      type: String,
    },
    country: {
      type: String,
    },
    pincode: {
      type: String,
    },
    dateOfBirth: {
      type: Date,
    },
    studentID: {
      type: String,
      unique: true,
    },
    course: {
      type: String,
    },
    department: {
      type: String,
    },
    joinDate: {
      type: Date,
    },

    staffID: {
      type: String,
      unique: true,
    },
    designation: {
      type: String,
    },

    isverified: {
      type: Boolean,
      default: false,
    },

    isMember: {
      type: Boolean,
      default: false,
    },
    Fineamnt: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const generateUserId = function () {
  const year = new Date().getFullYear().toString();
  const randomNumber = Math.floor(Math.random() * 100000000);
  return year + randomNumber;
};

//hash password
userSchema.pre<Iuser>("save", async function (next) {
  if (!this.user_id) {
    this.user_id = generateUserId();
  }

  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

//Sign Access Token - To create access token when user login
userSchema.methods.SignAccessToken = function () {
  return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN || "", {
    expiresIn: "5m",
  });
};

//Sign Refresh Token -
userSchema.methods.SignRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN || "", {
    expiresIn: "3d",
  });
};
//compare password

userSchema.methods.comparePassword = async function (enteredpassword: string) {
  return await bcrypt.compare(enteredpassword, this.password);
};

const userModel: Model<Iuser> = mongoose.model("User", userSchema);
export default userModel;
