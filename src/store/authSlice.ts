// src/store/authSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
}

// ✅ Load from localStorage
const getInitial = (): AuthState => {
  if (typeof window === 'undefined') {
    return { user: null, token: null, refreshToken: null };
  }

  const savedUser = localStorage.getItem('sb-user');
  const token = localStorage.getItem('sb-access-token');
  const refreshToken = localStorage.getItem('sb-refresh-token');

  return {
    user: savedUser ? JSON.parse(savedUser) : null,
    token,
    refreshToken,
  };
};

const initialState: AuthState = getInitial();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // ✅ When user logs in or session restored
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string; refreshToken: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;

      localStorage.setItem('sb-user', JSON.stringify(action.payload.user));
      localStorage.setItem('sb-access-token', action.payload.token);
      localStorage.setItem('sb-refresh-token', action.payload.refreshToken);
    },

    // ✅ When only tokens update (e.g., auto refresh)
    setToken: (state, action: PayloadAction<{ token: string; refreshToken: string }>) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      localStorage.setItem('sb-access-token', action.payload.token);
      localStorage.setItem('sb-refresh-token', action.payload.refreshToken);
    },

    // ✅ Update user info manually
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      if (action.payload) {
        localStorage.setItem('sb-user', JSON.stringify(action.payload));
      } else {
        localStorage.removeItem('sb-user');
      }
    },

    // ✅ Logout user and clear everything
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      localStorage.removeItem('sb-user');
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
    },
  },
});

export const { setCredentials, setToken, logout, setUser } = authSlice.actions;
export default authSlice.reducer;
