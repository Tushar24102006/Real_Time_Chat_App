import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: inject JWT Bearer token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('preppulse_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: auto-logout on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('preppulse_token');
        localStorage.removeItem('preppulse_user');
        window.dispatchEvent(new CustomEvent('preppulse:auth-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
  register: async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  }
};

export const userApi = {
  getCurrentUser: async () => {
    const res = await api.get('/users/me');
    return res.data;
  },
  searchUsers: async (query) => {
    const res = await api.get('/users/search', { params: { q: query } });
    return res.data;
  }
};

export const roomApi = {
  getMyRooms: async () => {
    const res = await api.get('/rooms');
    return res.data;
  },
  getRoomDetails: async (roomId) => {
    const res = await api.get(`/rooms/${roomId}`);
    return res.data;
  },
  createGroup: async (groupData) => {
    const res = await api.post('/rooms', groupData);
    return res.data;
  },
  getOrCreatePrivate: async (userId) => {
    const res = await api.post(`/rooms/private/${userId}`);
    return res.data;
  },
  addMember: async (roomId, memberData) => {
    const res = await api.post(`/rooms/${roomId}/members`, memberData);
    return res.data;
  },
  removeMember: async (roomId, userId) => {
    const res = await api.delete(`/rooms/${roomId}/members/${userId}`);
    return res.data;
  }
};

export const messageApi = {
  getMessages: async (roomId, page = 0, size = 30) => {
    const res = await api.get(`/rooms/${roomId}/messages`, {
      params: { page, size }
    });
    return res.data;
  },
  sendMessage: async (roomId, messageData) => {
    const res = await api.post(`/rooms/${roomId}/messages`, messageData);
    return res.data;
  },
  markAsRead: async (roomId) => {
    const res = await api.post(`/rooms/${roomId}/read`);
    return res.data;
  },
  deleteMessage: async (roomId, messageId) => {
    const res = await api.delete(`/rooms/${roomId}/messages/${messageId}`);
    return res.data;
  },
  searchMessages: async (roomId, query) => {
    const res = await api.get(`/rooms/${roomId}/messages/search`, {
      params: { q: query }
    });
    return res.data;
  }
};

export const uploadApi = {
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  }
};

export const presenceApi = {
  getOnlineUsers: async () => {
    const res = await api.get('/presence');
    return res.data;
  }
};

export default api;
