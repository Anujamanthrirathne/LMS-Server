"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLayoutByType = exports.editLayout = exports.createLayout = void 0;
const cloudinary_1 = __importDefault(require("cloudinary"));
const catchAsyncErrors_1 = require("./../middleware/catchAsyncErrors");
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const layout_model_1 = __importDefault(require("../models/layout.model"));
//create layout
exports.createLayout = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { type } = req.body;
        const isTypeExist = await layout_model_1.default.findOne({ type });
        if (isTypeExist) {
            return next(new ErrorHandler_1.default(`${type} already exists`, 400));
        }
        if (type === "Banner") {
            const { image, title, subTitle } = req.body;
            const myCloud = await cloudinary_1.default.v2.uploader.upload(image, {
                folder: "layout",
            });
            const banner = {
                type: "Banner",
                banner: {
                    image: {
                        public_id: myCloud.public_id,
                        url: myCloud.secure_url,
                    },
                    title,
                    subTitle,
                }
            };
            await layout_model_1.default.create(banner);
        }
        if (type === "FAQ") {
            const { faq } = req.body;
            const faqItems = faq.map((item) => ({
                question: item.question,
                answer: item.answer,
            }));
            await layout_model_1.default.create({ type: "FAQ", faq: faqItems });
        }
        if (type === "Categories") {
            const { categories } = req.body;
            const categoriesItems = categories.map((item) => ({
                title: item.title,
            }));
            // Use the correct key "categories"
            await layout_model_1.default.create({
                type: "Categories",
                categories: categoriesItems, // Corrected key
            });
        }
        res.status(200).json({
            success: true,
            message: "Layout created Successfully",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// Edit layout
exports.editLayout = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { type } = req.body;
        if (type === "Banner") {
            const bannerData = await layout_model_1.default.findOne({ type: "Banner" });
            const { image, title, subTitle } = req.body;
            const isExternalImage = typeof image === "string" && image.startsWith("https");
            const data = isExternalImage
                ? bannerData
                : await cloudinary_1.default.v2.uploader.upload(image, {
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
            await layout_model_1.default.findByIdAndUpdate(bannerData._id, { banner });
        }
        if (type === "Categories") {
            const { categories } = req.body;
            const categoriesData = await layout_model_1.default.findOne({ type: "Categories" });
            if (categoriesData) {
                const categoriesItems = categories.map((item) => ({
                    title: item.title,
                }));
                await layout_model_1.default.findByIdAndUpdate(categoriesData._id, {
                    categories: categoriesItems,
                });
            }
        }
        if (type === "FAQ") {
            const { faq } = req.body;
            // Validate the FAQ data: Ensure each item contains the required fields.
            if (!Array.isArray(faq)) {
                return next(new ErrorHandler_1.default("FAQ data must be an array", 400));
            }
            const validFaq = faq.map((item) => ({
                question: item.question,
                answer: item.answer,
            }));
            // Find existing FAQ layout
            const faqData = await layout_model_1.default.findOne({ type: "FAQ" });
            if (faqData) {
                // Update existing FAQ data
                await layout_model_1.default.findByIdAndUpdate(faqData._id, { faq: validFaq });
            }
            else {
                // Create new FAQ entry if not found
                await layout_model_1.default.create({ type: "FAQ", faq: validFaq });
            }
        }
        res.status(200).json({
            success: true,
            message: "Layout Updated Successfully",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// get layout by type
exports.getLayoutByType = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { type } = req.params; // Extract 'type' from the request parameters
        // Fetch the layout from the database based on 'type'
        const layout = await layout_model_1.default.findOne({ type });
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
    }
    catch (error) {
        // Handle errors and pass to the error handler
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
