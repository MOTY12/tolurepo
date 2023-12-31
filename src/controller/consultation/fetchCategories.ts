
import dotenv from 'dotenv';
import { Request, Response} from 'express';
import {  AuthenticationError } from '../../services/http_errors';
import HTTP_STATUS from 'http-status-codes';
import {consultationCareCategories} from '../../models/consultationCategories';


// eslint-disable-next-line @typescript-eslint/no-var-requires
dotenv.config();

interface QueryRequestBody {
	page: number;
	limit: number;
}


const fetchConsultationCategories = async (req: Request , res: Response): Promise<void> => {

    try {

	 		const { page, limit } = req.query as unknown as QueryRequestBody;

			const products = await consultationCareCategories.find()
			.limit(limit * 1)
			.skip((page - 1) * limit)
			.exec();

			if (!products) {
				res.status(HTTP_STATUS.BAD_REQUEST).json({
					status: HTTP_STATUS.BAD_REQUEST,
					error: new AuthenticationError('No Records'),
				});
				return;
			}

			const count = await consultationCareCategories.find().countDocuments();

      res.status(HTTP_STATUS.CREATED).json({
            status: HTTP_STATUS.CREATED,
            success: true,
            data: products,
						totalPages: Math.ceil(count / limit),
            currentPage: page
        });
				return;
    } catch (error) {
        res.status(500).json({
            status: 500,
            success: false,
            error: error
        });
    }
};
export default fetchConsultationCategories;
