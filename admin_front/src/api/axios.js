import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  timeout: 15000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED' && !orig._retry) {
      orig._retry = true;
      try {
        const rt = localStorage.getItem('refreshToken');
        const { data } = await axios.post('http://localhost:5000/api/v1/auth/refresh', { refreshToken: rt });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        orig.headers.Authorization = `Bearer ${data.accessToken}`;
        return API(orig);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default API;
