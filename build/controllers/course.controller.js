"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVideoUrl = exports.deleteCourse = exports.getAllCourse = exports.addReplyToReview = exports.addReview = exports.addAnswer = exports.addQuestion = exports.getCourseByUser = exports.getAllCourses = exports.getSingleCourse = exports.editCourse = exports.uploadCourse = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const course_service_1 = require("./../services/course.service");
const cloudinary_1 = require("cloudinary");
const catchAsyncErrors_1 = require("../middleware/catchAsyncErrors");
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const course_model_1 = __importDefault(require("../models/course.model"));
const redis_1 = require("../utils/redis");
const mongoose_1 = __importDefault(require("mongoose"));
const notificationModel_1 = __importDefault(require("../models/notificationModel"));
const axios_1 = __importDefault(require("axios"));
const course_model_2 = __importDefault(require("../models/course.model"));
// Upload course with Cloudinary integration
exports.uploadCourse = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        // Ensure thumbnail is provided
        if (thumbnail) {
            // Cloudinary upload with increased timeout
            const myCloud = await cloudinary_1.v2.uploader.upload(thumbnail, {
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
        await (0, course_service_1.createCourse)(data, res, next);
    }
    catch (error) {
        console.error("Error uploading course:", error); // Log the error for debugging
        return next(new ErrorHandler_1.default(error.message || "Server error occurred while uploading course", 500));
    }
});
//edit course
exports.editCourse = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const data = req.body;
        const thumbnail = data.thumbnail;
        const courseId = req.params.id;
        const courseData = await course_model_2.default.findById(courseId);
        if (thumbnail && !thumbnail.startsWith("https")) {
            // Handle the thumbnail upload to cloudinary
            await cloudinary_1.v2.uploader.destroy(courseData.thumbnail.public_id);
            const myCloud = await cloudinary_1.v2.uploader.upload(thumbnail, {
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
        const course = await course_model_1.default.findByIdAndUpdate(courseId, {
            $set: data,
        }, { new: true });
        res.status(201).json({
            success: true,
            course,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// get single course -- without purchasing
exports.getSingleCourse = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const courseId = req.params.id;
        const isCacheExist = await redis_1.redis.get(courseId);
        if (isCacheExist) {
            const course = JSON.parse(isCacheExist);
            res.status(200).json({
                success: true,
                course,
            });
        }
        else {
            const course = await course_model_1.default
                .findById(req.params.id)
                .select("-courseData.videoUrl -courseData.suggestion -courseData-questions -courseData.links");
            await redis_1.redis.set(courseId, JSON.stringify(course), "EX", 604800); // 7days
            res.status(200).json({
                success: true,
                course,
            });
        }
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// get all courses --with purchasing
exports.getAllCourses = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const courses = await course_model_1.default
            .find()
            .select(" -courseData.videoUrl -courseData.suggestion -courseData-questions -courseData.links");
        res.status(200).json({
            success: true,
            courses,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
// get user content --only for valid user
exports.getCourseByUser = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        // Ensure the user is authenticated
        if (!req.user) {
            return next(new ErrorHandler_1.default("User not authenticated", 401));
        }
        const userCourseList = req.user?.courses; // Array of user's courses
        const courseId = req.params.id; // The course ID to check
        // Check if the user is an admin, admins can access all courses
        if (req.user.role === 'admin') {
            const course = await course_model_2.default.findById(courseId);
            if (!course) {
                return next(new ErrorHandler_1.default("Course not found", 404));
            }
            const content = course.courseData; // Retrieve the course content
            return res.status(200).json({
                success: true,
                content,
            });
        }
        // Check if the course exists in the user's courses list
        const courseExists = userCourseList?.some((course) => course.courseId === courseId // Match using `courseId` field
        );
        if (!courseExists) {
            return next(new ErrorHandler_1.default("You are not eligible to access this course", 404));
        }
        // Retrieve the course details from the database
        const course = await course_model_2.default.findById(courseId);
        if (!course) {
            return next(new ErrorHandler_1.default("Course not found", 404));
        }
        const content = course.courseData; // Retrieve the course content
        // Respond with course content
        res.status(200).json({
            success: true,
            content,
        });
    }
    catch (error) {
        // Log any errors for debugging
        console.error("Error fetching course:", error);
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
exports.addQuestion = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { question, courseId, contentId } = req.body;
        // Find the course by its ID
        const course = await course_model_1.default.findById(courseId);
        // Validate contentId
        if (!mongoose_1.default.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler_1.default("Invalid content ID", 400));
        }
        // Find the specific content within the course
        const courseContent = course?.courseData?.find((item) => item._id.equals(contentId));
        if (!courseContent) {
            return next(new ErrorHandler_1.default("Content not found", 500));
        }
        // Create a new question object
        const newQuestion = {
            user: req.user,
            question: question,
            questionReplies: [],
        };
        // Push the new question to the content's questions list
        courseContent.questions.push(newQuestion);
        await notificationModel_1.default.create({
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
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
exports.addAnswer = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { answer, courseId, contentId, questionId } = req.body;
        // Fetch the course and populate the 'user' field inside questions
        const course = await course_model_1.default.findById(courseId).populate({
            path: "courseData.questions.user", // Populate user data for each question
            model: "User",
        });
        if (!course) {
            return next(new ErrorHandler_1.default("Course not found", 404));
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler_1.default("Invalid content ID", 400));
        }
        // Find the course content
        const courseContent = course?.courseData?.find((item) => item._id.equals(contentId));
        if (!courseContent) {
            return next(new ErrorHandler_1.default("Invalid content ID", 400));
        }
        // Find the question
        const question = courseContent?.questions?.find((item) => item._id.equals(questionId));
        if (!question) {
            return next(new ErrorHandler_1.default("Invalid question ID", 400));
        }
        // Create a new answer object
        const newAnswer = {
            user: req.user,
            answer,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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
            await notificationModel_1.default.create({
                user: req.user?._id,
                title: "New Question Reply Received",
                message: `you have a new question reply in ${courseContent.title}`,
            });
        }
        else {
            // Ensure that the question's user email exists
            if (!question.user.email) {
                return next(new ErrorHandler_1.default("No email found for the question author", 400));
            }
            // Send the email asynchronously
            const transporter = nodemailer_1.default.createTransport({
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
            }
            catch (error) {
                console.error("Error sending email:", error);
                return next(new ErrorHandler_1.default(`Email sending failed: ${error.message}`, 500));
            }
        }
        res.status(200).json({
            success: true,
            message: "Answer added successfully and notification sent.",
            course,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
exports.addReview = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        // Extract the course ID from the request parameters
        const courseId = req.params.id;
        // Get the list of courses the user is enrolled in from the user object
        const userCourseList = req.user?.courses;
        // Check if the courseId exists in the user's enrolled courses
        const courseExists = userCourseList?.some((course) => course.courseId.toString() === courseId.toString());
        if (!courseExists) {
            return next(new ErrorHandler_1.default("You are not eligible to access this course", 400));
        }
        // Find the course by its ID
        const course = await course_model_1.default.findById(courseId);
        if (!course) {
            return next(new ErrorHandler_1.default("Course not found", 404)); // Handle case where course is not found
        }
        // Extract review and rating from the request body
        const { review, rating } = req.body;
        // Create a new review object
        const reviewData = {
            user: req.user,
            comment: review,
            rating,
        };
        // Add the review to the course's reviews array
        course.reviews.push(reviewData);
        // Calculate the new average rating
        let avg = 0;
        course.reviews.forEach((rev) => {
            avg += rev.rating;
        });
        course.ratings = avg / course.reviews.length; // Update the average rating
        // Save the updated course document
        await course.save();
        await redis_1.redis.set(courseId, JSON.stringify(course), "EX", 604800);
        try {
            await notificationModel_1.default.create({
                userId: req.user?._id, // Ensure this aligns with the schema
                title: "New Review Received",
                message: `${req.user?.name} has given a review in ${course?.name}`,
            });
            console.log("Notification created successfully.");
        }
        catch (error) {
            console.error("Notification creation failed:", 400);
        }
        // Respond with a success message and the updated course
        res.status(200).json({
            success: true,
            message: "Review added successfully",
            course,
        });
    }
    catch (error) {
        // Handle errors and return a response with the error message
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
exports.addReplyToReview = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { comment, courseId, reviewId } = req.body;
        const course = await course_model_1.default.findById(courseId);
        if (!course) {
            return next(new ErrorHandler_1.default("course not found", 404));
        }
        const review = course?.reviews?.find((rev) => rev._id.toString() === reviewId);
        if (!review) {
            return next(new ErrorHandler_1.default("review not found", 404));
        }
        const replyData = {
            user: req.user,
            comment,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        if (!review.commentReplies) {
            review.commentReplies = [];
        }
        review.commentReplies?.push(replyData);
        await course?.save();
        await redis_1.redis.set(courseId, JSON.stringify(course), "EX", 604800);
        res.status(200).json({
            success: true,
            course,
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 500));
    }
});
//get all courses
exports.getAllCourse = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        (0, course_service_1.getAllCourseService)(res);
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
//delete course --admin
exports.deleteCourse = (0, catchAsyncErrors_1.CatchAsyncError)(async (req, res, next) => {
    try {
        const { id } = req.params;
        const course = await course_model_1.default.findById(id);
        if (!course) {
            return next(new ErrorHandler_1.default("course not found", 404));
        }
        await course.deleteOne({ id });
        await redis_1.redis.del(id);
        res.status(200).json({
            success: true,
            message: "course deleted successfully",
        });
    }
    catch (error) {
        return next(new ErrorHandler_1.default(error.message, 400));
    }
});
// generate video url
const generateVideoUrl = async (req, res, next) => {
    try {
        const { videoId } = req.body;
        // Call VdoCipher API
        const response = await axios_1.default.post(`https://dev.vdocipher.com/api/videos/${videoId}/otp`, { ttl: 300 }, {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Apisecret ${process.env.VDOCIPHER_API_SECRET}`,
            },
        });
        // Send OTP and playback info to the frontend
        res.json(response.data);
    }
    catch (error) {
        console.error("Error fetching video OTP:", error.response?.data || error.message);
        res
            .status(500)
            .json({ message: "Error fetching video OTP", error: error.message });
    }
};
exports.generateVideoUrl = generateVideoUrl;
