import { updateAccessToken } from "../controllers/user.controller";
import { createOrder, getAllOrders, newPayment, sendStripePublishleKey } from "./../controllers/order.controller";
import { authorizeRoles, isAuthenticated } from "./../middleware/auth";
import express from "express";
const orderRouter = express.Router();

orderRouter.post("/create-order", isAuthenticated, createOrder);

orderRouter.get(
  "/get-orders",
  updateAccessToken,
  isAuthenticated,
  authorizeRoles("admin"),
  getAllOrders
);

orderRouter.get("/payment/stripepublishleKey",sendStripePublishleKey);

orderRouter.post("/payment",isAuthenticated,newPayment)

export default orderRouter;
