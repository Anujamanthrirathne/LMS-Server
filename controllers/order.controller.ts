import { getAllOrderService } from "./../services/order.service";
import { CatchAsyncError } from "./../middleware/catchAsyncErrors";
import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import order, { IOrder } from "../models/order.Model";
import userModel from "../models/user.model"; 
import CourseModel from "../models/course.model";
import path from "path";
import ejs from "ejs";
import sendMail from "../utils/sendMail";
import NotificationModel from "../models/notificationModel";
import { newOrder } from "../services/order.service";
import { redis } from "../utils/redis";
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Create order
export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, payment_info } = req.body as IOrder;

      if(payment_info){
        if("id" in payment_info){
            const paymentIntentId = payment_info.id;
            const paymentIntent = await stripe.paymentIntents.retrieve(
                paymentIntentId
            );
            if(paymentIntent.status !== "succeeded"){
                return next(new ErrorHandler("payment not authorized!",400))
            }
        }
      }
      

      // Fetch the user making the order
      const user = await userModel.findById(req.user?._id);
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      // Check if the course exists
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      // Check if the user has already purchased this course
      const courseExistsInUser = user.courses.some(
        (userCourse: any) =>
          userCourse.courseId.toString() === courseId.toString()
      );
      if (courseExistsInUser) {
        return next(
          new ErrorHandler("You have already purchased this course", 400)
        );
      }

      // Additional check: Ensure the user hasn't already created an order for the same course
      const existingOrder = await order.findOne({ courseId, userId: user._id });
      if (existingOrder) {
        return next(
          new ErrorHandler("You already have an order for this course", 400)
        );
      }

      // Prepare the order data
      const data: any = {
        courseId: course._id,
        userId: user._id,
        payment_info,
      };

      // Create a new order
      await newOrder(data, res, next);

      // Prepare email data
      const mailData = {
        order: {
          _id: course._id.toString().slice(0, 6),
          name: course.name,
          price: course.price,
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      };
      

      // Send confirmation email
      try {
        if (user.email) {
          await sendMail({
            email: user.email,
            subject: "Order Confirmation",
            template: "mail-order.ejs",
            data: mailData,
          });
        }
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
      }

      // Add the course to the user's purchased courses
      user?.courses.push({ courseId: course._id });
      await redis.set(req!.user!._id!, JSON.stringify(user));
      await user?.save();

      // Create a notification for the user
      await NotificationModel.create({
        user: user._id,
        title: "New Order",
        message: `You have successfully purchased ${course.name}`,
      });

      // Increment the `purchased` count for the course
      course.purchased = (course.purchased || 0) + 1;
      await course.save();

      res.status(201).json({
        success: true,
        message: "Order placed successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Get all orders from admin
export const getAllOrders = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllOrderService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//sent stripe publishble key
export const sendStripePublishleKey = CatchAsyncError(
  async (req: Request, res: Response) => {
    res.status(200).json({
      publishbleKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  }
);

// new payment
export const newPayment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const myPayment = await stripe.paymentIntents.create({
        amount: req.body.amount,
        currency: "USD",
        metadata: {
          company: "E-Learning",
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.status(201).json({
        success: true,
        client_secret: myPayment.client_secret,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
