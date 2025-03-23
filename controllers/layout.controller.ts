import cloudinary from "cloudinary";
import { CatchAsyncError } from "./../middleware/catchAsyncErrors";
import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import LayoutModel from "../models/layout.model";
import { title } from "process";

//create layout
export const createLayout = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;
      const isTypeExist = await LayoutModel.findOne({ type });
      if (isTypeExist) {
        return next(new ErrorHandler(`${type} already exists`, 400));
      }
      if (type === "Banner") {
        const { image, title, subTitle } = req.body;
        const myCloud = await cloudinary.v2.uploader.upload(image, {
          folder: "layout",
        });
        const banner = {
          type: "Banner",
          banner:{
          image: {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          },
          title,
          subTitle,
        }
      }

        await LayoutModel.create(banner);
      }
      if (type === "FAQ") {
        const { faq } = req.body;
        const faqItems = faq.map((item: any) => ({
          question: item.question,
          answer: item.answer,
        }));

        await LayoutModel.create({ type: "FAQ", faq: faqItems });
      }

      if (type === "Categories") {
        const { categories } = req.body;
        const categoriesItems = categories.map((item: any) => ({
          title: item.title,
        }));
      
        // Use the correct key "categories"
        await LayoutModel.create({
          type: "Categories",
          categories: categoriesItems, // Corrected key
        });
      }
      
      res.status(200).json({
        success: true,
        message: "Layout created Successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Edit layout
export const editLayout = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;

      if (type === "Banner") {
        const bannerData: any = await LayoutModel.findOne({ type: "Banner" });
        const { image, title, subTitle } = req.body;

        const isExternalImage = typeof image === "string" && image.startsWith("https");

        const data = isExternalImage
          ? bannerData
          : await cloudinary.v2.uploader.upload(image, {
              folder: "layout",
            });

        const banner = {
          type: "Banner",
          image: {
            public_id: isExternalImage
              ? bannerData.banner.image.public_id
              : data?.public_id,
            url: isExternalImage
              ? bannerData.banner.image.url
              : data?.secure_url,
          },
          title,
          subTitle,
        };

        await LayoutModel.findByIdAndUpdate(bannerData._id, { banner });
      }

      if (type === "Categories") {
        const { categories } = req.body;
        const categoriesData = await LayoutModel.findOne({ type: "Categories" });

        if (categoriesData) {
          const categoriesItems = categories.map((item: any) => ({
            title: item.title,
          }));

          await LayoutModel.findByIdAndUpdate(categoriesData._id, {
            categories: categoriesItems,
          });
        }
      }

      if (type === "FAQ") {
        const { faq } = req.body;

        // Validate the FAQ data: Ensure each item contains the required fields.
        if (!Array.isArray(faq)) {
          return next(new ErrorHandler("FAQ data must be an array", 400));
        }

        const validFaq = faq.map((item: any) => ({
          question: item.question,
          answer: item.answer,
        }));

        // Find existing FAQ layout
        const faqData = await LayoutModel.findOne({ type: "FAQ" });

        if (faqData) {
          // Update existing FAQ data
          await LayoutModel.findByIdAndUpdate(faqData._id, { faq: validFaq });
        } else {
          // Create new FAQ entry if not found
          await LayoutModel.create({ type: "FAQ", faq: validFaq });
        }
      }

      res.status(200).json({
        success: true,
        message: "Layout Updated Successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

  // get layout by type
 export const getLayoutByType = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params; // Extract 'type' from the request parameters

    // Fetch the layout from the database based on 'type'
    const layout = await LayoutModel.findOne({ type });

    // If no layout is found, return a 404 response
    if (!layout) {
      return res.status(404).json({
        success: false,
        message: "Layout not found",
      });
    }

    // Return the layout with a 200 status code if found
    res.status(200).json({
      success: true,
      layout,
    });
  } catch (error: any) {
    // Handle errors and pass to the error handler
    return next(new ErrorHandler(error.message, 500));
  }
});
