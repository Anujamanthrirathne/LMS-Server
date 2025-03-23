import { Document, Model } from 'mongoose';

interface MonthData {
    month: string;
    count: number;
}

export async function generateLast12MonthsData<T extends Document>(
    model: Model<T>
): Promise<{ last12Months: MonthData[] }> {
    const last12Months: MonthData[] = [];
    const currentDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
        // Get the first day of the month `i` months ago
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);

        // Get the last day of the same month
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);

        // Format the date to show short month name and year
        const monthYear = startDate.toLocaleString('default', { month: 'short', year: 'numeric' });

        // Count the number of documents created in this month range
        const count = await model.countDocuments({
            createdAt: {
                $gte: startDate,
                $lte: endDate,
            }
        });

        // Push the result to the array
        last12Months.push({ month: monthYear, count });
    }

    return { last12Months };
}
