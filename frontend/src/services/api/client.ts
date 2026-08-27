import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optionally, we could add interceptors here for robust error handling.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // We log it here, but let the caller handle it.
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
