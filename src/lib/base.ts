import axios from 'axios'

import { getApiUrl } from './api'

export const http = axios.create({
  baseURL: getApiUrl(),
  timeout: 1000 * 60 * 2,
})

http.interceptors.request.use(config => {
  const token = localStorage.getItem('jwt')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }

  // Add debugging info
  console.log(
    `REQUEST [${config.method?.toUpperCase()}] ${config.url}`,
    config.data || {}
  )

  return config
})

http.interceptors.response.use(
  response => {
    console.log(
      `RESPONSE [${response.status}] ${response.config.url}`,
      response.data
    )
    return response
  },
  error => {
    console.error('API ERROR:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)
