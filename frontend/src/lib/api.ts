import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
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
        const refreshToken = useAuthStore.getState().refreshToken;
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        useAuthStore.getState().setAccessToken(data.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
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
  isActive?: boolean;
  createdAt?: string;
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

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  schedule: string;
  isActive: boolean;
  _count?: {
    copies: number;
    loans: number;
  };
}

export interface Copy {
  id: string;
  barcode: string;
  status: 'AVAILABLE' | 'LOANED' | 'RESERVED' | 'MAINTENANCE' | 'TRANSFERRED' | 'LOST' | 'DAMAGED';
  condition: 'NEW' | 'GOOD' | 'FAIR' | 'POOR';
  zone: string | null;
  shelf: string | null;
  position: number | null;
  bookId: string;
  branchId: string;
  book: { id: string; title: string; isbn: string };
  branch: { id: string; name: string };
}

export interface BookPayload {
  isbn: string;
  title: string;
  synopsis?: string;
  coverUrl?: string;
  publishedYear?: number;
  publisher?: string;
  language?: string;
  pageCount?: number;
  authorId: string;
  genreId: string;
}

export interface BranchPayload {
  name: string;
  address: string;
  phone?: string;
  schedule?: string;
}

export interface CopyPayload {
  barcode: string;
  bookId: string;
  branchId: string;
  condition?: Copy['condition'];
  zone?: string;
  shelf?: string;
  position?: number;
}

export interface CopyUpdatePayload {
  status?: Copy['status'];
  condition?: Copy['condition'];
  zone?: string | null;
  shelf?: string | null;
  position?: number | null;
}

export interface Fine {
  id: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'PAID' | 'WAIVED' | string;
  paidAt: string | null;
  waivedBy: string | null;
  waivedAt: string | null;
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'email'>;
  loan?: {
    id: string;
    dueDate: string;
    returnDate: string | null;
    copy: {
      id: string;
      barcode: string;
      book: { id: string; title: string };
    };
  };
}

export interface Loan {
  id: string;
  loanDate: string;
  dueDate: string;
  returnDate: string | null;
  renewalCount: number;
  maxRenewals: number;
  user?: Pick<User, 'id' | 'name' | 'email'>;
  branch?: Pick<Branch, 'id' | 'name'>;
  copy: {
    id: string;
    barcode?: string;
    status?: Copy['status'];
    book: { id: string; title: string; isbn?: string; coverUrl: string | null };
    branch: { id: string; name: string };
  };
  fines?: Fine[];
}

export type LoanStatusFilter = 'active' | 'returned' | 'overdue' | 'all';

export interface LoanPayload {
  copyId: string;
  userId: string;
  branchId: string;
  dueDays: number;
}

export type ReservationStatus = 'WAITING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
export type ReservationStatusFilter = 'active' | 'waiting' | 'ready' | 'completed' | 'cancelled' | 'expired' | 'all';

export interface Reservation {
  id: string;
  position: number;
  status: ReservationStatus;
  notifiedAt: string | null;
  expiresAt: string;
  createdAt: string;
  user?: Pick<User, 'id' | 'name' | 'email'>;
  copy: {
    id: string;
    barcode: string;
    status: Copy['status'];
    book: { id: string; title: string; isbn: string; coverUrl: string | null };
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
  getOptions: () => api.get('/books/options'),
  create: (payload: BookPayload) => api.post('/books', payload),
  update: (id: string, payload: Partial<BookPayload>) => api.put(`/books/${id}`, payload),
  delete: (id: string) => api.delete(`/books/${id}`),
};

export const loansApi = {
  getAll: (params?: { status?: LoanStatusFilter; q?: string; userId?: string; branchId?: string; page?: number; limit?: number }) =>
    api.get('/loans', { params }),
  getMy: (params?: { history?: boolean }) =>
    api.get('/loans/my', { params }),
  getOverdue: () => api.get('/loans/overdue'),
  create: (payload: LoanPayload) => api.post('/loans', payload),
  renew: (id: string) => api.post(`/loans/${id}/renew`),
  return: (id: string) => api.post(`/loans/${id}/return`),
};

export const reservationsApi = {
  getAll: (params?: { status?: ReservationStatusFilter; q?: string; userId?: string; page?: number; limit?: number }) =>
    api.get('/reservations', { params }),
  getMy: (params?: { status?: ReservationStatusFilter }) =>
    api.get('/reservations/my', { params }),
  create: (copyId: string) => api.post('/reservations', { copyId }),
  createByTitle: (bookId: string) => api.post('/reservations/by-title', { bookId }),
  cancel: (id: string) => api.post(`/reservations/${id}/cancel`),
  fulfill: (id: string, dueDays = 14) => api.post(`/reservations/${id}/fulfill`, { dueDays }),
  waive: (id: string) => api.patch(`/reservations/${id}/waive`),
};

export const branchesApi = {
  getAll: () => api.get('/branches'),
  getById: (id: string) => api.get(`/branches/${id}`),
  create: (payload: BranchPayload) => api.post('/branches', payload),
  update: (id: string, payload: Partial<BranchPayload>) => api.put(`/branches/${id}`, payload),
  delete: (id: string) => api.delete(`/branches/${id}`),
};

export const copiesApi = {
  getAll: (params?: { bookId?: string; branchId?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/copies', { params }),
  getById: (id: string) => api.get(`/copies/${id}`),
  create: (payload: CopyPayload) => api.post('/copies', payload),
  update: (id: string, payload: CopyUpdatePayload) => api.put(`/copies/${id}`, payload),
  transfer: (id: string, targetBranchId: string) =>
    api.post(`/copies/${id}/transfer`, { targetBranchId }),
};

export const usersApi = {
  getAll: (params?: { q?: string; role?: string; isActive?: string; page?: number; limit?: number }) =>
    api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (payload: { email: string; password: string; name: string; role: User['role']; isActive?: boolean }) =>
    api.post('/users', payload),
  update: (id: string, payload: Partial<Pick<User, 'name' | 'role' | 'isActive'>>) =>
    api.put(`/users/${id}`, payload),
  deactivate: (id: string) => api.delete(`/users/${id}`),
};

export const finesApi = {
  getAll: (params?: { status?: string; userId?: string; q?: string; page?: number; limit?: number }) =>
    api.get('/fines', { params }),
  getMy: () => api.get('/fines/my'),
  pay: (id: string) => api.patch(`/fines/${id}/pay`),
  waive: (id: string) => api.patch(`/fines/${id}/waive`),
};

export const acquisitionsApi = {
  // Vendors
  getVendors: () => api.get('/acquisitions/vendors'),
  createVendor: (data: { name: string; email?: string; phone?: string; contact?: string; address?: string }) =>
    api.post('/acquisitions/vendors', data),
  deleteVendor: (id: string) => api.delete(`/acquisitions/vendors/${id}`),

  // Orders
  getOrders: (params?: { status?: string; vendorId?: string; q?: string; page?: number; limit?: number }) =>
    api.get('/acquisitions/orders', { params }),
  getOrder: (id: string) => api.get(`/acquisitions/orders/${id}`),
  createOrder: (data: { vendorId: string; notes?: string; expectedDate?: string; items: Array<{ title: string; author?: string; isbn?: string; publisher?: string; publishedYear?: number; price: number; quantity: number }> }) =>
    api.post('/acquisitions/orders', data),
  receiveOrder: (orderId: string, itemId?: string) =>
    api.post(`/acquisitions/orders/${orderId}/receive`, { itemId }),
  deleteOrder: (id: string) => api.delete(`/acquisitions/orders/${id}`),

  // Suggestions
  getSuggestions: (params?: { status?: string; q?: string; page?: number; limit?: number }) =>
    api.get('/acquisitions/suggestions', { params }),
  getMySuggestions: () => api.get('/acquisitions/suggestions/my'),
  createSuggestion: (data: { title: string; author?: string; isbn?: string; publisher?: string; publishedYear?: number; reason?: string }) =>
    api.post('/acquisitions/suggestions', data),
  updateSuggestion: (id: string, data: { status: string }) =>
    api.put(`/acquisitions/suggestions/${id}`, data),
};
