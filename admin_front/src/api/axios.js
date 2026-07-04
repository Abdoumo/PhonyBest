import axios from 'axios';

const API = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/v1`,
  timeout: 15000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

API.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED' && !orig._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          orig.headers.Authorization = `Bearer ${token}`;
          return API(orig);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      orig._retry = true;
      isRefreshing = true;

      try {
        const rt = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/v1/auth/refresh`, { refreshToken: rt });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        orig.headers.Authorization = `Bearer ${data.accessToken}`;
        processQueue(null, data.accessToken);
        return API(orig);
      } catch (error) {
        processQueue(error, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default API;
