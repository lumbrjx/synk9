import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PredictorService {
	async predict(numbers: number[]) {
		try {
			const paramsString = numbers.join(',');
			const response = await axios.get(process.env.AI_URL as string, {
				params: { features: paramsString },
			});
			Logger.log(`Sent: ${paramsString} | Response: ${JSON.stringify(response.data)}`);
			return response.data;
		} catch (error) {
			Logger.error('Prediction error:', error);
		}
	}
}

