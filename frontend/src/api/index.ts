import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// Auth
export const sendOtp = (phone: string) =>
  api.post('/auth/send-otp', { phone });

export const verifyOtp = (phone: string, code: string) =>
  api.post<{ token: string; user: User }>('/auth/verify-otp', { phone, code });

export const getMe = () =>
  api.get<User>('/auth/me');

// Products
export const getProducts = () =>
  api.get<Product[]>('/products');

export const getProduct = (id: string) =>
  api.get<Product>(`/products/${id}`);

export const adminGetProducts = () =>
  api.get<Product[]>('/products/admin');

export const createProduct = (data: Partial<Product>) =>
  api.post<Product>('/products', data);

export const updateProduct = (id: string, data: Partial<Product>) =>
  api.patch<Product>(`/products/${id}`, data);

export const deleteProduct = (id: string) =>
  api.delete(`/products/${id}`);

// Orders
export const createOrder = (data: CreateOrderPayload) =>
  api.post<Order>('/orders', data);

export const getMyOrders = () =>
  api.get<Order[]>('/orders/my');

export const getMyOrder = (id: string) =>
  api.get<Order>(`/orders/my/${id}`);

export const adminGetOrders = () =>
  api.get<Order[]>('/orders');

export const updateOrderStatus = (id: string, status: string) =>
  api.patch(`/orders/${id}/status`, { status });

export const exportOrdersCsv = () =>
  api.get('/orders/export/csv', { responseType: 'blob' });

// Payments
export const createPayment = (orderId: string) =>
  api.post<{ confirmUrl: string; paymentId: string }>(`/payments/create/${orderId}`);

// Profile
export const getProfile = () =>
  api.get<UserProfile>('/profile');

export const updateProfile = (data: Partial<UserProfile>) =>
  api.patch<UserProfile>('/profile', data);

// Types
export interface User {
  id: string;
  phone: string;
  role: 'USER' | 'ADMIN';
}

export interface UserProfile {
  id: string;
  phone: string;
  role: 'USER' | 'ADMIN';
  firstName?: string;
  lastName?: string;
  email?: string;
  defaultAddress?: string;
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number | string;
  stock: number;
  imageUrl?: string;
  active: boolean;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number | string;
  product?: { name: string; imageUrl?: string };
}

export interface Order {
  id: string;
  status: string;
  total: number | string;
  address: string;
  phone: string;
  name: string;
  comment?: string;
  items: OrderItem[];
  payment?: { status: string; confirmUrl?: string };
  createdAt: string;
}

export interface CreateOrderPayload {
  items: { productId: string; quantity: number }[];
  address: string;
  name: string;
  phone: string;
  comment?: string;
}

export default api;
