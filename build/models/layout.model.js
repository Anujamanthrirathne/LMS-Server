"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const faqSchema = new mongoose_1.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
});
const categorySchema = new mongoose_1.Schema({
    title: { type: String, required: true },
});
const bannerImageSchema = new mongoose_1.Schema({
    public_id: { type: String, required: true },
    url: { type: String, required: true },
});
const layoutSchema = new mongoose_1.Schema({
    type: { type: String, required: true },
    faq: [faqSchema], // Correctly define as an array of `faqSchema`
    categories: [categorySchema], // Correctly define as an array of `categorySchema`
    banner: {
        image: bannerImageSchema,
        title: { type: String },
        subTitle: { type: String },
    },
});
const LayoutModel = (0, mongoose_1.model)("Layout", layoutSchema);
exports.default = LayoutModel;
