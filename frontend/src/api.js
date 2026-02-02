import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.DEV ? 'http://127.0.0.1:8000/api/' : 'https://playto-pulse.onrender.com/api/',
    timeout: 60000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
