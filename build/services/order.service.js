"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllOrderService = exports.newOrder = void 0;
const catchAsyncErrors_1 = require("../middleware/catchAsyncErrors");
const order_Model_1 = __importDefault(require("../models/order.Model"));
// Create new order
exports.newOrder = (0, catchAsyncErrors_1.CatchAsyncError)(async (data, res) => {
    try {
        // Create the order
        const order = await order_Model_1.default.create(data);
        // Return the response with success status and the created order
        res.status(201).json({
            success: true,
            order,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Something went wrong while creating the order.',
        });
    }
});
const getAllOrderService = async (res) => {
    const orders = await order_Model_1.default.find().sort({ createdAt: -1 });
    res.status(201).json({
        success: true,
        orders,
    });
};
exports.getAllOrderService = getAllOrderService;
