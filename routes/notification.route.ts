import { updateAccessToken } from "../controllers/user.controller";
import {
  getNotification,
  updateNotification,
} from "./../controllers/notification.controller";
import { authorizeRoles, isAuthenticated } from "./../middleware/auth";
import express from "express";
const notificationRoute = express.Router();

notificationRoute.get(
  "/get-all-notifications",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  getNotification
);

notificationRoute.put(
  "/update-notification/:id",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  updateNotification
);

export default notificationRoute;
