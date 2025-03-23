import { updateAccessToken } from "../controllers/user.controller";
import {
  createLayout,
  editLayout,
  getLayoutByType,
} from "./../controllers/layout.controller";
import { authorizeRoles, isAuthenticated } from "./../middleware/auth";
import express from "express";

const layoutRouter = express.Router();

layoutRouter.post(
  "/create-layout",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  createLayout
);

layoutRouter.put(
  "/edit-layout",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  editLayout
);

layoutRouter.get("/get-layout/:type", getLayoutByType);

export default layoutRouter;
