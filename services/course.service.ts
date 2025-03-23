import CourseModel from '../models/course.model';
import { CatchAsyncError } from '../middleware/catchAsyncErrors';
import { Response } from 'express';
import courseModel from '../models/course.model';

export const createCourse = CatchAsyncError(async (data: any, res: Response) => {
  const course = await CourseModel.create(data);
  res.status(201).json({
    success: true,
    course,
  });
});

export const getAllCourseService = async(res:Response) =>{
  const courses = await courseModel.find().sort({createdAt:-1});

  res.status(201).json({
    success:true,
    courses,
  })
  
}