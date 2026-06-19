import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Authorization token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('netflix_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid - clear local storage
      localStorage.removeItem('netflix_token');
      localStorage.removeItem('netflix_user');
      // Trigger a page refresh or handle auth redirect in context
    }
    return Promise.reject(error);
  }
);

export default API;
