"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementDownloadCount = exports.deleteResource = exports.updateResource = exports.getResourceById = exports.getResources = exports.createResource = void 0;
const cloudinary_1 = require("cloudinary");
const resource_model_1 = __importDefault(require("../models/resource.model"));
const multer_1 = __importDefault(require("multer"));
const streamifier_1 = __importDefault(require("streamifier"));
const pdf_parse_1 = __importDefault(require("pdf-parse")); // Import pdf-parse for PDF processing
// Setup multer to handle file uploads
// Function to count word occurrences in PDF text
const countWordOccurrences = (pdfText, searchWords) => {
    let wordCounts = {};
    searchWords.forEach((word) => {
        const regex = new RegExp(word, 'gi');
        const count = (pdfText.match(regex) || []).length;
        wordCounts[word] = count;
    });
    return wordCounts;
};
// Setup multer to handle in-memory file uploads
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage }).fields([
    { name: 'pdfFile', maxCount: 1 }, // 1 PDF file
    { name: 'thumbnailFile', maxCount: 1 }, // 1 Thumbnail image
]);
// ✅ Create Resource (Uploads PDF & Thumbnail to Cloudinary)
const createResource = async (req, res) => {
    const customReq = req; // customRequest type for multer file handling
    // Handle file uploads with multer
    upload(customReq, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: "File upload error", error: err });
        }
        try {
            const { name, title, description, category, links } = customReq.body;
            const pdfFile = customReq.files['pdfFile']?.[0]; // Get the PDF file
            const thumbnailFile = customReq.files['thumbnailFile']?.[0]; // Get the Thumbnail file
            if (!pdfFile || !thumbnailFile) {
                return res.status(400).json({ message: "PDF and Thumbnail files are required" });
            }
            // Parse the PDF to get text and count word occurrences
            const pdfBuffer = pdfFile.buffer;
            const data = await (0, pdf_parse_1.default)(pdfBuffer);
            const pdfText = data.text;
            const technologies = ['Node.js', 'React.js', 'JavaScript']; // Example tech terms
            const wordCounts = countWordOccurrences(pdfText, technologies);
            // Upload PDF to Cloudinary
            const pdfUpload = cloudinary_1.v2.uploader.upload_stream({
                resource_type: "raw", // For non-image files like PDFs
                folder: "resources/pdfs",
            }, async (error, result) => {
                if (error) {
                    return res.status(500).json({ message: "Error uploading PDF", error });
                }
                // Upload Thumbnail to Cloudinary
                const thumbnailUpload = cloudinary_1.v2.uploader.upload_stream({
                    resource_type: "image", // For image files
                    folder: "resources/thumbnails",
                }, async (thumbnailError, thumbnailResult) => {
                    if (thumbnailError) {
                        return res.status(500).json({ message: "Error uploading Thumbnail", error: thumbnailError });
                    }
                    // Save resource metadata to DB after successful uploads
                    const newResource = new resource_model_1.default({
                        name,
                        title,
                        description,
                        links,
                        pdfUrl: result?.secure_url, // URL for the PDF
                        thumbnailUrl: thumbnailResult?.secure_url, // URL for the Thumbnail
                        category,
                        downloadedCount: 0,
                        wordCounts, // Store word counts in the DB
                    });
                    await newResource.save();
                    res.status(201).json(newResource);
                });
                // Pipe the thumbnail stream to Cloudinary
                const thumbnailStream = streamifier_1.default.createReadStream(thumbnailFile.buffer);
                thumbnailStream.pipe(thumbnailUpload);
            });
            // Pipe the PDF stream to Cloudinary
            const pdfStream = streamifier_1.default.createReadStream(pdfFile.buffer);
            pdfStream.pipe(pdfUpload);
        }
        catch (error) {
            console.error("Error creating resource:", error);
            res.status(500).json({ message: "Error creating resource", error });
        }
    });
};
exports.createResource = createResource;
// ✅ Get All Resources
const getResources = async (_req, res) => {
    try {
        const resources = await resource_model_1.default.find();
        res.status(200).json(resources);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching resources", error });
    }
};
exports.getResources = getResources;
// ✅ Get Single Resource by ID
const getResourceById = async (req, res) => {
    try {
        const resource = await resource_model_1.default.findById(req.params.id);
        if (!resource) {
            res.status(404).json({ message: "Resource not found" });
            return; // Ensure we return after sending a response.
        }
        res.status(200).json(resource);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching resource", error });
    }
};
exports.getResourceById = getResourceById;
// ✅ Update Resource
const updateResource = async (req, res) => {
    try {
        const updatedResource = await resource_model_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updatedResource);
    }
    catch (error) {
        res.status(500).json({ message: "Error updating resource", error });
    }
};
exports.updateResource = updateResource;
// ✅ Delete Resource (Deletes from DB & Cloudinary)
const deleteResource = async (req, res) => {
    try {
        const resource = await resource_model_1.default.findById(req.params.id);
        if (!resource) {
            res.status(404).json({ message: "Resource not found" });
            return; // After sending a response, return to prevent further execution
        }
        // Extract public IDs from Cloudinary URLs
        const pdfPublicId = resource.pdfUrl.split("/").pop()?.split(".")[0];
        const thumbPublicId = resource.thumbnailUrl.split("/").pop()?.split(".")[0];
        if (pdfPublicId) {
            await cloudinary_1.v2.uploader.destroy(`resources/pdfs/${pdfPublicId}`, { resource_type: "raw" });
        }
        if (thumbPublicId) {
            await cloudinary_1.v2.uploader.destroy(`resources/thumbnails/${thumbPublicId}`, { resource_type: "image" });
        }
        await resource.deleteOne();
        res.status(200).json({ message: "Resource deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting resource", error });
    }
};
exports.deleteResource = deleteResource;
// ✅ Increment Download Count
const incrementDownloadCount = async (req, res) => {
    try {
        const resource = await resource_model_1.default.findById(req.params.id);
        if (!resource) {
            res.status(404).json({ message: "Resource not found" });
            return;
        }
        // Increment download count
        resource.downloadedCount += 1;
        // Save the updated resource
        await resource.save();
        // Respond with the updated download count
        res.status(200).json({ message: "Download count updated", count: resource.downloadedCount });
    }
    catch (error) {
        // Handle errors
        res.status(500).json({ message: "Error updating download count", error });
    }
};
exports.incrementDownloadCount = incrementDownloadCount;
