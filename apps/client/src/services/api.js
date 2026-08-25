import axios from 'axios';

function getCookie(name) {
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : undefined;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase();
  if (['post', 'patch', 'put', 'delete'].includes(method)) {
    const csrfToken = getCookie(import.meta.env.VITE_CSRF_COOKIE_NAME || 'csrfToken');
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

export default api;
