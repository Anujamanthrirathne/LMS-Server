import { NextFunction, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import OrderModel from "../models/order.Model";

// Create new order
export const newOrder = CatchAsyncError(async (data: any, res: Response) => {
  try {
    // Create the order
    const order = await OrderModel.create(data);

    // Return the response with success status and the created order
    res.status(201).json({
      success: true,
      order,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Something went wrong while creating the order.',
    });
  }
});

export const getAllOrderService = async(res:Response) =>{
  const orders = await OrderModel.find().sort({createdAt:-1});

  res.status(201).json({
    success:true,
    orders,
  })
  
}
