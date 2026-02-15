import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    withCredentials: true, // Send cookies with requests
});

api.interceptors.request.use((config) => {
    // We rely on cookies now, but keep this if you want hybrid approach
    // const token = localStorage.getItem('auth_token');
    // if (token) {
    //     config.headers.Authorization = `Bearer ${token}`;
    // }
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
