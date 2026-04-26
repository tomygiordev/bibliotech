import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'LIBRARIAN' | 'MEMBER';
}

export interface Book {
  id: string;
  isbn: string;
  title: string;
  synopsis: string | null;
  coverUrl: string | null;
  publishedYear: number | null;
  publisher: string | null;
  author: { id: string; name: string };
  genre: { id: string; name: string };
  copies: Array<{
    id: string;
    status: string;
    branch: { id: string; name: string };
  }>;
}

export interface Loan {
  id: string;
  loanDate: string;
  dueDate: string;
  returnDate: string | null;
  renewalCount: number;
  maxRenewals: number;
  copy: {
    id: string;
    book: { id: string; title: string; coverUrl: string | null };
    branch: { id: string; name: string };
  };
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, name: string) =>
    api.post('/auth/register', { email, password, name }),
  me: () => api.get('/auth/me'),
};

export const booksApi = {
  search: (params: { q?: string; page?: number; limit?: number; genre?: string; available?: string }) =>
    api.get('/books', { params }),
  getById: (id: string) => api.get(`/books/${id}`),
};

export const loansApi = {
  getMy: () => api.get('/loans/my'),
  renew: (id: string) => api.post(`/loans/${id}/renew`),
  return: (id: string) => api.post(`/loans/${id}/return`),
};

export const branchesApi = {
  getAll: () => api.get('/branches'),
};
