import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
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
