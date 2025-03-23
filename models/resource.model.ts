import mongoose, { Schema, Document } from "mongoose";

export interface IResource extends Document {
  name: string;
  title: string;
  description: string;
  pdfUrl: string; // URL for the downloadable PDF
  thumbnailUrl: string; // URL for the thumbnail image
  category: string; 
  downloadedCount: number; 
  createdAt: Date;
  updatedAt: Date;
  links: string[]; 
}

const ResourceSchema = new Schema<IResource>(
  {
    name: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    pdfUrl: { type: String}, // Store PDF file URL
    thumbnailUrl: { type: String }, // Store thumbnail image URL
    category: { type: String, required: true }, // e.g., "Programming", "Web Development"
    downloadedCount: { type: Number, default: 0 }, // Track number of downloads
    links: { type: [String], default: [] }, // Array to store external links
  },
  { timestamps: true }
);

const Resource = mongoose.model<IResource>("Resource", ResourceSchema);
export default Resource;
