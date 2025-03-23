import { v2 as cloudinary } from "cloudinary";
import { Request, Response } from "express";
import Resource from "../models/resource.model";
import multer from "multer";
import streamifier from "streamifier";
import PDFParser from "pdf-parse";  // Import pdf-parse for PDF processing



// Setup multer to handle file uploads
// Function to count word occurrences in PDF text
const countWordOccurrences = (pdfText: string, searchWords: string[]): object => {
  let wordCounts: { [key: string]: number } = {};
  searchWords.forEach((word) => {
    const regex = new RegExp(word, 'gi');
    const count = (pdfText.match(regex) || []).length;
    wordCounts[word] = count;
  });
  return wordCounts;
};

// Setup multer to handle in-memory file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage }).fields([
  { name: 'pdfFile', maxCount: 1 },  // 1 PDF file
  { name: 'thumbnailFile', maxCount: 1 },  // 1 Thumbnail image
]);

// ✅ Create Resource (Uploads PDF & Thumbnail to Cloudinary)
export const createResource = async (req: Request, res: Response): Promise<void> => {
  const customReq = req as any;  // customRequest type for multer file handling

  // Handle file uploads with multer
  upload(customReq, res, async (err: any) => {
    if (err) {
      return res.status(400).json({ message: "File upload error", error: err });
    }

    try {
      const { name, title, description, category, links } = customReq.body;
      const pdfFile = customReq.files['pdfFile']?.[0];  // Get the PDF file
      const thumbnailFile = customReq.files['thumbnailFile']?.[0];  // Get the Thumbnail file

      if (!pdfFile || !thumbnailFile) {
        return res.status(400).json({ message: "PDF and Thumbnail files are required" });
      }

      // Parse the PDF to get text and count word occurrences
      const pdfBuffer = pdfFile.buffer;
      const data = await PDFParser(pdfBuffer);
      const pdfText = data.text;

      const technologies = ['Node.js', 'React.js', 'JavaScript'];  // Example tech terms
      const wordCounts = countWordOccurrences(pdfText, technologies);

      // Upload PDF to Cloudinary
      const pdfUpload = cloudinary.uploader.upload_stream({
        resource_type: "raw",  // For non-image files like PDFs
        folder: "resources/pdfs",
      }, async (error, result) => {
        if (error) {
          return res.status(500).json({ message: "Error uploading PDF", error });
        }

        // Upload Thumbnail to Cloudinary
        const thumbnailUpload = cloudinary.uploader.upload_stream({
          resource_type: "image",  // For image files
          folder: "resources/thumbnails",
        }, async (thumbnailError, thumbnailResult) => {
          if (thumbnailError) {
            return res.status(500).json({ message: "Error uploading Thumbnail", error: thumbnailError });
          }

          // Save resource metadata to DB after successful uploads
          const newResource = new Resource({
            name,
            title,
            description,
            links,
            pdfUrl: result?.secure_url,  // URL for the PDF
            thumbnailUrl: thumbnailResult?.secure_url,  // URL for the Thumbnail
            category,
            downloadedCount: 0,
            wordCounts,  // Store word counts in the DB
          });

          await newResource.save();
          res.status(201).json(newResource);
        });

        // Pipe the thumbnail stream to Cloudinary
        const thumbnailStream = streamifier.createReadStream(thumbnailFile.buffer);
        thumbnailStream.pipe(thumbnailUpload);
      });

      // Pipe the PDF stream to Cloudinary
      const pdfStream = streamifier.createReadStream(pdfFile.buffer);
      pdfStream.pipe(pdfUpload);

    } catch (error) {
      console.error("Error creating resource:", error);
      res.status(500).json({ message: "Error creating resource", error });
    }
  });
};



// ✅ Get All Resources
export const getResources = async (_req: Request, res: Response) => {
  try {
    const resources = await Resource.find();
    res.status(200).json(resources);
  } catch (error) {
    res.status(500).json({ message: "Error fetching resources", error });
  }
};

// ✅ Get Single Resource by ID
export const getResourceById = async (req: Request, res: Response): Promise<void> => {
    try {
      const resource = await Resource.findById(req.params.id);
      if (!resource) {
        res.status(404).json({ message: "Resource not found" });
        return; // Ensure we return after sending a response.
      }
      res.status(200).json(resource);
    } catch (error) {
      res.status(500).json({ message: "Error fetching resource", error });
    }
  };
  
// ✅ Update Resource
export const updateResource = async (req: Request, res: Response) => {

  try {
    const updatedResource = await Resource.findByIdAndUpdate(req.params.id, req.body, { new: true });
  
    res.status(200).json(updatedResource);
  } catch (error) {
    res.status(500).json({ message: "Error updating resource", error });
  }
};

// ✅ Delete Resource (Deletes from DB & Cloudinary)
export const deleteResource = async (req: Request, res: Response): Promise<void> => {
    try {
      const resource = await Resource.findById(req.params.id);
      if (!resource) {
        res.status(404).json({ message: "Resource not found" });
        return; // After sending a response, return to prevent further execution
      }
  
      // Extract public IDs from Cloudinary URLs
      const pdfPublicId = resource.pdfUrl.split("/").pop()?.split(".")[0];
      const thumbPublicId = resource.thumbnailUrl.split("/").pop()?.split(".")[0];
  
      if (pdfPublicId) {
        await cloudinary.uploader.destroy(`resources/pdfs/${pdfPublicId}`, { resource_type: "raw" });
      }
      if (thumbPublicId) {
        await cloudinary.uploader.destroy(`resources/thumbnails/${thumbPublicId}`, { resource_type: "image" });
      }
  
      await resource.deleteOne();
      res.status(200).json({ message: "Resource deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting resource", error });
    }
  };
  

// ✅ Increment Download Count
export const incrementDownloadCount = async (req: Request, res: Response): Promise<void> => {
    try {
      const resource = await Resource.findById(req.params.id);
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
    } catch (error) {
      // Handle errors
      res.status(500).json({ message: "Error updating download count", error });
    }
  };
  
