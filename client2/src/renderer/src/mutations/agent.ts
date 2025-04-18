import { baseUrl } from '@/config'
import axios from 'axios'

export async function create<T>(route: string, data: T) {
  console.log("sfasdfl", data)
  try {
    const response = await axios.post(baseUrl + route, data, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    return response.data

  } catch (e) {
    console.log('e', e)
  }
}
export async function remove(route: string) {
  const response = await axios.delete(baseUrl + route, {
    headers: {
      "Content-Type": "application/json",
    },
  })
  return response.data
}
export async function update<T>(route: string, data: T) {
  const response = await axios.patch(baseUrl + route, data, {
    headers: {
      "Content-Type": "application/json",
    },
  })
  return response.data
}


