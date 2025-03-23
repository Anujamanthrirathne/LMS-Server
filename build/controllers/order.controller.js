"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newPayment = exports.sendStripePublishleKey = exports.getAllOrders = exports.createOrder = void 0;
const order_service_1 = require("./../services/order.service");
const catchAsyncErrors_1 = require("./../middleware/catchAsyncErrors");
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const order_Model_1 = __importDefault(require("../models/order.Model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const course_model_1 = __importDefault(require("../models/course.model"));
const sendMail_1 = __importDefault(require("../utils/sendMail"));
const notificationModel_1 = __importDefault(require("../models/notificationModel"));
const order_service_2 = require("../services/order.service");
const redis_1 = require("../utils/redis");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
// Create order
exports.createOrder = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { courseId, payment_info } = req.body;
        if (payment_info) {
            if ("id" in payment_info) {
                const paymentIntentId = payment_info.id;
                const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
                if (paymentIntent.status !== "succeeded") {
                    return next(new ErrorHandler_1.default("payment not authorized!", 400));
                }
            }
        }
        // Fetch the user making the order
        const user = await user_model_1.default.findById(req.user?._id);
        if (!user) {
            return next(new ErrorHandler_1.default("User not found", 404));
        }
        // Check if the course exists
        const course = await course_model_1.default.findById(courseId);
        if (!course) {
            return next(new ErrorHandler_1.default("Course not found", 404));
        }
        // Check if the user has already purchased this course
        const courseExistsInUser = user.courses.some((userCourse) => userCourse.courseId.toString() === courseId.toString());
        if (courseExistsInUser) {
            return next(new ErrorHandler_1.default("You have already purchased this course", 400));
        }
        // Additional check: Ensure the user hasn't already created an order for the same course
        const existingOrder = await order_Model_1.default.findOne({ courseId, userId: user._id });
        if (existingOrder) {
            return next(new ErrorHandler_1.default("You already have an order for this course", 400));
        }
        // Prepare the order data
        const data = {
            courseId: course._id,
            userId: user._id,
            payment_info,
        };
        // Create a new order
        await (0, order_service_2.newOrder)(data, res, next);
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
                await (0, sendMail_1.default)({
                    email: user.email,
                    subject: "Order Confirmation",
                    template: "mail-order.ejs",
                    data: mailData,
                });
            }
        }
        catch (error) {
            return next(new ErrorHandler_1.default(error.message, 500));
        }
        // Add the course to the user's purchased courses
        user?.courses.push({ courseId: course._id });
        await redis_1.redis.set(req.user._id, JSON.stringify(user));
        await user?.save();
        // Create a notification for the user
        await notificationModel_1.default.create({
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
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// Get all orders from admin
exports.getAllOrders = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        (0, order_service_1.getAllOrderService)(res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
//sent stripe publishble key
exports.sendStripePublishleKey = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res) => {
    res.status(200).json({
        publishbleKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
});
// new payment
exports.newPayment = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
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
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
