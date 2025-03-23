import nodemailer from "nodemailer";
import {
  createCourse,
  getAllCourseService,
} from "./../services/course.service";
import { v2 as cloudinary } from "cloudinary";
import { Response, NextFunction, Request } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import courseModel from "../models/course.model";
import { redis } from "../utils/redis";
import mongoose from "mongoose";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import { userInfo } from "os";
import NotificationModel from "../models/notificationModel";
import axios from "axios";
import CourseModel from "../models/course.model";

// Upload course with Cloudinary integration
export const uploadCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;

      // Ensure thumbnail is provided
      if (thumbnail) {
        // Cloudinary upload with increased timeout
        const myCloud = await cloudinary.uploader.upload(thumbnail, {
          folder: "courses", // Specify Cloudinary folder for organization
          timeout: 120000, // Timeout set to 2 minutes (120000 ms)
        });

        // Save Cloudinary response to course data
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }

      // Proceed with course creation (async)
      await createCourse(data, res, next);
    } catch (error: any) {
      console.error("Error uploading course:", error); // Log the error for debugging
      return next(
        new ErrorHandler(
          error.message || "Server error occurred while uploading course",
          500
        )
      );
    }
  }
);

//edit course
export const editCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      const courseId = req.params.id;
      const courseData = await CourseModel.findById(courseId) as any;
      
      if (thumbnail && !thumbnail.startsWith("https")) {
        // Handle the thumbnail upload to cloudinary
        await cloudinary.uploader.destroy(courseData.thumbnail.public_id);
      
        const myCloud = await cloudinary.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }
      
      if (thumbnail.startsWith("https")) {
        data.thumbnail = {
          public_id: courseData?.thumbnail.public_id,
          url: courseData?.thumbnail.url,
        };
      }
      

      const course = await courseModel.findByIdAndUpdate(
        courseId,
        {
          $set:data,
        },
        {new:true}
      );
      res.status(201).json({
        success:true,
        course,
    });
    
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get single course -- without purchasing
export const getSingleCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;

      const isCacheExist = await redis.get(courseId);
      if (isCacheExist) {
        const course = JSON.parse(isCacheExist);
        res.status(200).json({
          success: true,
          course,
        });
      } else {
        const course = await courseModel
          .findById(req.params.id)
          .select(
            "-courseData.videoUrl -courseData.suggestion -courseData-questions -courseData.links"
          );

        await redis.set(courseId, JSON.stringify(course), "EX", 604800); // 7days

        res.status(200).json({
          success: true,
          course,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get all courses --with purchasing
export const getAllCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = await courseModel
        .find()
        .select(
          " -courseData.videoUrl -courseData.suggestion -courseData-questions -courseData.links"
        );
 
      res.status(200).json({
        success: true,
        courses,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// get user content --only for valid user
export const getCourseByUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Ensure the user is authenticated
      if (!req.user) {
        return next(new ErrorHandler("User not authenticated", 401));
      }

      const userCourseList = req.user?.courses; // Array of user's courses
      const courseId = req.params.id; // The course ID to check

      // Check if the user is an admin, admins can access all courses
      if (req.user.role === 'admin') {
        const course = await CourseModel.findById(courseId);
        if (!course) {
          return next(new ErrorHandler("Course not found", 404));
        }

        const content = course.courseData; // Retrieve the course content
        return res.status(200).json({
          success: true,
          content,
        });
      }

      // Check if the course exists in the user's courses list
      const courseExists = userCourseList?.some(
        (course: any) => course.courseId === courseId // Match using `courseId` field
      );

      if (!courseExists) {
        return next(
          new ErrorHandler("You are not eligible to access this course", 404)
        );
      }

      // Retrieve the course details from the database
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      const content = course.courseData; // Retrieve the course content

      // Respond with course content
      res.status(200).json({
        success: true,
        content,
      });
    } catch (error: any) {
      // Log any errors for debugging
      console.error("Error fetching course:", error);

      return next(new ErrorHandler(error.message, 500));
    }
  }
);



// add question in course
interface IAddQuestionData {
  question: string;
  courseId: string;
  contentId: string;
}

export const addQuestion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, courseId, contentId }: IAddQuestionData = req.body;

      // Find the course by its ID
      const course = await courseModel.findById(courseId);

      // Validate contentId
      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content ID", 400));
      }

      // Find the specific content within the course
      const courseContent = course?.courseData?.find((item: any) =>
        item._id.equals(contentId)
      );

      if (!courseContent) {
        return next(new ErrorHandler("Content not found", 500));
      }

      // Create a new question object
      const newQuestion: any = {
        user: req.user,
        question: question,
        questionReplies: [],
      };

      // Push the new question to the content's questions list
      courseContent.questions.push(newQuestion);

      await NotificationModel.create({
        user: req.user?._id,
        title: "New Question Received",
        message: `You have a new question in ${courseContent.title}`,
      });

      // Save the updated course data
      await course?.save();

      // Return the updated course with the new question
      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
//add answer in course question
interface IAddAnswerData {
  answer: string;
  courseId: string;
  contentId: string;
  questionId: string;
}

export const addAnswer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { answer, courseId, contentId, questionId }: IAddAnswerData =
        req.body;

      // Fetch the course and populate the 'user' field inside questions
      const course = await courseModel.findById(courseId).populate({
        path: "courseData.questions.user", // Populate user data for each question
        model: "User",
      });

      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content ID", 400));
      }

      // Find the course content
      const courseContent = course?.courseData?.find((item: any) =>
        item._id.equals(contentId)
      );
      if (!courseContent) {
        return next(new ErrorHandler("Invalid content ID", 400));
      }

      // Find the question
      const question = courseContent?.questions?.find((item: any) =>
        item._id.equals(questionId)
      );
      if (!question) {
        return next(new ErrorHandler("Invalid question ID", 400));
      }

      // Create a new answer object
      const newAnswer: any = {
        user: req.user,
        answer,
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString(),
      };

      // Ensure questionReplies exists
      if (!question.questionReplies) {
        question.questionReplies = [];
      }

      // Push the new answer
      question.questionReplies.push(newAnswer);

      // Save the course (saving specific data could be more efficient if necessary)
      await course.save();

      // Check if the answering user is the same as the question asker
      if (req.user?._id.toString() === question.user._id.toString()) {
        await NotificationModel.create({
          user: req.user?._id,
          title: "New Question Reply Received",
          message: `you have a new question reply in ${courseContent.title}`,
        });
      } else {
        // Ensure that the question's user email exists
        if (!question.user.email) {
          return next(
            new ErrorHandler("No email found for the question author", 400)
          );
        }

        // Send the email asynchronously
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_MAIL, // The email address
            pass: process.env.SMTP_PASSWORD // The app-specific password or your Gmail password (if 2FA isn't enabled)
          },
          socketTimeout: 60000, // Increase socket timeout to 60 seconds
          connectionTimeout: 60000, // Increase connection timeout to 60 seconds
        });
        

        const mailOptions = {
          from: process.env.EMAIL,
          to: question.user.email,
          subject: "Question Reply",
          text: `You have a new reply to your question in course: ${courseContent.title}`,
        };

        try {
          await transporter.sendMail(mailOptions);
        } catch (error: any) {
          console.error("Error sending email:", error);
          return next(
            new ErrorHandler(`Email sending failed: ${error.message}`, 500)
          );
        }
      }

      res.status(200).json({
        success: true,
        message: "Answer added successfully and notification sent.",
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);


// add review in course
interface IAddReviewData {
  review: string;
  courseId: string;
  rating: number;
  userId: string;
}

export const addReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract the course ID from the request parameters
      const courseId = req.params.id;

      // Get the list of courses the user is enrolled in from the user object
      const userCourseList = req.user?.courses;

      // Check if the courseId exists in the user's enrolled courses
      const courseExists = userCourseList?.some(
        (course: any) => course.courseId.toString() === courseId.toString()
      );
      if (!courseExists) {
        return next(
          new ErrorHandler("You are not eligible to access this course", 400)
        );
      }

      // Find the course by its ID
      const course = await courseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404)); // Handle case where course is not found
      }

      // Extract review and rating from the request body
      const { review, rating } = req.body as IAddReviewData;

      // Create a new review object
      const reviewData: any = {
        user: req.user,
        comment: review,
        rating,
      };

      // Add the review to the course's reviews array
      course.reviews.push(reviewData);

      // Calculate the new average rating
      let avg = 0;
      course.reviews.forEach((rev: any) => {
        avg += rev.rating;
      });
      course.ratings = avg / course.reviews.length; // Update the average rating

      // Save the updated course document
      await course.save();

     await redis.set(courseId,JSON.stringify(course),"EX",604800);
       
     try {
      await NotificationModel.create({
        userId: req.user?._id, // Ensure this aligns with the schema
        title: "New Review Received",
        message: `${req.user?.name} has given a review in ${course?.name}`,
      });
      console.log("Notification created successfully.");
    } catch (error) {
      console.error("Notification creation failed:", 400);
    }
    
             
      // Respond with a success message and the updated course
      res.status(200).json({
        success: true,
        message: "Review added successfully",
        course,
      });
    } catch (error: any) {
      // Handle errors and return a response with the error message
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// add reply in review
interface IAddReviewData {
  comment: string;
  courseId: string;
  reviewId: string;
}

export const addReplyToReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, courseId, reviewId } = req.body as IAddReviewData;

      const course = await courseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("course not found", 404));
      }
      const review = course?.reviews?.find(
        (rev: any) => rev._id.toString() === reviewId
      );

      if (!review) {
        return next(new ErrorHandler("review not found", 404));
      }
      const replyData: any = {
        user: req.user,
        comment,
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString(),
      };
      if (!review.commentReplies) {
        review.commentReplies = [];
      }
      review.commentReplies?.push(replyData);

      await course?.save();

      await redis.set(courseId,JSON.stringify(course),"EX",604800);
      
      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
); 

//get all courses
export const getAllCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllCourseService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

//delete course --admin

export const deleteCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const course = await courseModel.findById(id);

      if (!course) {
        return next(new ErrorHandler("course not found", 404));
      }
      await course.deleteOne({ id });
      await redis.del(id);

      res.status(200).json({
        success: true,
        message: "course deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// generate video url
export const generateVideoUrl = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.body;

    // Call VdoCipher API
    const response = await axios.post(
      `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
      { ttl: 300 },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,
        },
      }
    );

    // Send OTP and playback info to the frontend
    res.json(response.data);
  } catch (error: any) {
    console.error(
      "Error fetching video OTP:",
      error.response?.data || error.message
    );
    res
      .status(500)
      .json({ message: "Error fetching video OTP", error: error.message });
  }
};
