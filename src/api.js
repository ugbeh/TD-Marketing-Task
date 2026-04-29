// src/api.js
// Central API client. All backend calls go through here.
// Axios automatically attaches the JWT token to every request.

import axios from 'axios';

// Base URL is just /api — Vite proxies it to http://localhost:3001
const api = axios.create({ baseURL: '/api' });

// Attach the stored JWT token to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────
export const login          = (email, password) => api.post('/auth/login', { email, password });
export const autoLogin      = ()                => api.post('/auth/auto');
export const getMe          = ()                => api.get('/auth/me');
export const forgotPassword = (email)           => api.post('/auth/forgot-password', { email });
export const resetPassword  = (token, password) => api.post('/auth/reset-password', { token, password });

// ── Tasks ─────────────────────────────────────────────────────
export const getTasks          = ()           => api.get('/tasks');
export const createTask        = (data)       => api.post('/tasks', data);
export const updateTask        = (id, data)   => api.put(`/tasks/${id}`, data);
export const updateTaskStatus  = (id, status) => api.patch(`/tasks/${id}/status`, { status });
export const deleteTask        = (id)         => api.delete(`/tasks/${id}`);

// ── Projects ──────────────────────────────────────────────────
export const getProjects    = ()         => api.get('/projects');
export const createProject  = (data)     => api.post('/projects', data);
export const updateProject  = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject  = (id)       => api.delete(`/projects/${id}`);

// ── Users ─────────────────────────────────────────────────────
export const getUsers        = ()             => api.get('/users');
export const createUser      = (data)         => api.post('/users', data);
export const updateUser      = (id, data)     => api.put(`/users/${id}`, data);
export const updateUserRole  = (id, role)     => api.patch(`/users/${id}/role`, { role });
export const deleteUser      = (id)           => api.delete(`/users/${id}`);
// Avatar upload — sends a FormData object with field name "avatar"
export const uploadAvatar    = (id, formData) => api.patch(`/users/${id}/avatar`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

// ── Comments ──────────────────────────────────────────────────
export const getComments    = (taskId)              => api.get(`/tasks/${taskId}/comments`);
export const addComment     = (taskId, content)     => api.post(`/tasks/${taskId}/comments`, { content });
export const deleteComment  = (taskId, commentId)   => api.delete(`/tasks/${taskId}/comments/${commentId}`);

// ── Chat ──────────────────────────────────────────────────────
export const getChatHistory = () => api.get('/chat');

// ── Notifications ─────────────────────────────────────────────
export const getNotifications  = ()   => api.get('/notifications');
export const markAllRead       = ()   => api.patch('/notifications/read-all');
