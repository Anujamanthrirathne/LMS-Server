import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
    courseId: mongoose.Schema.Types.ObjectId;
    userId: mongoose.Schema.Types.ObjectId;
    payment_info: { id: string };
    createdAt: Date;
    updatedAt: Date;
}

const orderSchema = new Schema<IOrder>({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,  // Ensure it's required
        ref: 'Course',
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,  // Ensure it's required
        ref: 'User',
    },
    payment_info: {
        id: { type: String, required: true }, // Ensure the ID is required
    },
    
}, {
    timestamps: true,  // Automatically add createdAt and updatedAt
});

const OrderModel = mongoose.model<IOrder>('Order', orderSchema);

export default OrderModel;
