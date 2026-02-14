import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_ORIGIN || 'http://localhost:3000/api', // Use VITE_API_ORIGIN or default to proxy
});

api.interceptors.request.use((config) => {
    const session = localStorage.getItem('telegram_session');
    if (session) {
        config.headers.Authorization = `Bearer ${session}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle global errors here
        console.error('API Error:', error);
        return Promise.reject(error);
    }
);

export default api;
