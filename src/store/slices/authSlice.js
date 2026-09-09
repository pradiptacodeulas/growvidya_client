import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminLoginApi, getAdminProfileApi, adminLogoutApi } from '../../api/adminAuth.api';

// Async Thunks
export const loginAdmin = createAsyncThunk(
  'auth/loginAdmin',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await adminLoginApi(credentials);
      const resData = response.data?.data || response.data || {};
      const token = resData.token;
      const user = resData.user;

      if (token) {
        localStorage.setItem('admin_token', token);
        localStorage.removeItem('teacher_token');
        localStorage.removeItem('parent_token');
      }
      return { user, token };
    } catch (error) {
      if (!error.response) {
        return rejectWithValue('Network error: Unable to reach backend server. Please verify server connection.');
      }
      return rejectWithValue(error.response?.data?.message || 'Login failed. Please check credentials.');
    }
  }
);

export const checkAdminAuth = createAsyncThunk(
  'auth/checkAdminAuth',
  async (_, { rejectWithValue }) => {
    try {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const hasAdminToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const isProtectedAdminPath = currentPath.startsWith('/admin') && !currentPath.startsWith('/admin/login') && currentPath !== '/account/login/adminlogin';

      if (!isProtectedAdminPath && !hasAdminToken) {
        return rejectWithValue('No active admin session');
      }

      const response = await getAdminProfileApi();
      const resData = response.data?.data || response.data || {};
      return resData.user || resData;
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
      }
      return rejectWithValue('Session invalid or expired');
    }
  }
);

export const logoutAdmin = createAsyncThunk('auth/logoutAdmin', async () => {
  try {
    await adminLogoutApi();
  } catch (e) {
    // Ignore network errors during logout
  } finally {
    localStorage.removeItem('admin_token');
  }
});

const hasAdminToken = typeof window !== 'undefined' ? Boolean(localStorage.getItem('admin_token')) : false;

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: false,
    checkingAuth: hasAdminToken,
    error: null,
  },
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
    updateUserState: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    updateUserSchoolInfo: (state, action) => {
      if (state.user) {
        if (action.payload.schoolName !== undefined) {
          state.user.schoolName = action.payload.schoolName;
        }
        if (action.payload.schoolLogo !== undefined) {
          state.user.schoolLogo = action.payload.schoolLogo;
        }
        if (action.payload.schoolFooter !== undefined) {
          state.user.schoolFooter = action.payload.schoolFooter;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.checkingAuth = false;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.checkingAuth = false;
        state.error = action.payload;
      })
      // Check Auth
      .addCase(checkAdminAuth.pending, (state) => {
        state.checkingAuth = true;
      })
      .addCase(checkAdminAuth.fulfilled, (state, action) => {
        state.checkingAuth = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(checkAdminAuth.rejected, (state) => {
        state.checkingAuth = false;
        state.isAuthenticated = false;
        state.user = null;
      })
      // Logout
      .addCase(logoutAdmin.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.checkingAuth = false;
        state.error = null;
      });
  },
});

export const { clearAuthError, updateUserState, updateUserSchoolInfo } = authSlice.actions;
export default authSlice.reducer;
