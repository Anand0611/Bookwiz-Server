import express from "express";
import {
  activateUser,
  registrationUser,
  loginUser,
  logoutUser,
  updateAccessToken,
  getUserInfo,
  socialAuth,
  completeProfile,
  updatePassword,
  updateProfilePicture,
  makeUserAdmin,
} from "../controllers/user.controller";
import {
  authorizeRoles,
  isAutheticated,
  validateUser,
} from "../middleware/auth";
const userRouter = express.Router();

userRouter.post("/registration", registrationUser);
userRouter.post("/activate-user", activateUser);
userRouter.post("/login", loginUser);
userRouter.get("/logout", isAutheticated, logoutUser);
userRouter.get("/refresh", updateAccessToken);
userRouter.get("/me", isAutheticated, getUserInfo);
userRouter.post("/social-auth", socialAuth);
userRouter.put("/make-admin", updateAccessToken, isAutheticated, makeUserAdmin);
userRouter.put("/update-user-info", isAutheticated, completeProfile);
userRouter.put(
  "/update-user-password",
  updateAccessToken,
  isAutheticated,
  updatePassword
);
userRouter.put(
  "/update-user-avatar",
  updateAccessToken,
  isAutheticated,
  updateProfilePicture
);

export default userRouter;
