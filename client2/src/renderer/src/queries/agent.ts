import { baseUrl } from '@/config';
import axios from 'axios'


export const query = async (route: string) => {
  try {
    const response = await axios.get(baseUrl + route);
    return response.data
  } catch (e) {
    throw e;
  }
}



