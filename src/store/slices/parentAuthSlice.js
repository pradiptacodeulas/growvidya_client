import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { parentLoginApi, getParentProfileApi, switchActiveStudentApi, parentLogoutApi } from '../../api/parentAuth.api';

// Async Thunks
export const loginParent = createAsyncThunk(
  'parentAuth/loginParent',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await parentLoginApi(credentials);
      const resData = response.data?.data || response.data || {};
      const token = resData.token;
      const parent = resData.parent;

      if (token) {
        localStorage.setItem('parent_token', token);
        localStorage.removeItem('teacher_token');
        localStorage.removeItem('admin_token');
      }
      return { parent, token };
    } catch (error) {
      if (!error.response) {
        return rejectWithValue('Network error: Unable to reach backend server. Please verify server connection.');
      }
      return rejectWithValue(error.response?.data?.message || 'Login failed. Please check parent credentials.');
    }
  }
);

export const checkParentAuth = createAsyncThunk(
  'parentAuth/checkParentAuth',
  async (studentId, { rejectWithValue }) => {
    try {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const hasParentToken = typeof window !== 'undefined' ? localStorage.getItem('parent_token') : null;
      const isProtectedParentPath = currentPath.startsWith('/parent') && !currentPath.startsWith('/parentaccount') && !currentPath.startsWith('/parent/login');

      // If not on a protected parent path and no token exists, skip request
      if (!isProtectedParentPath && !hasParentToken) {
        return rejectWithValue('No active parent session');
      }

      const response = await getParentProfileApi(studentId);
      const resData = response.data?.data || response.data || {};
      return resData.parent || resData;
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('parent_token');
      }
      return rejectWithValue('Parent session invalid or expired');
    }
  }
);

export const switchStudent = createAsyncThunk(
  'parentAuth/switchStudent',
  async (studentId, { rejectWithValue }) => {
    try {
      const response = await switchActiveStudentApi(studentId);
      const resData = response.data?.data || response.data || {};
      if (resData.token) {
        localStorage.setItem('parent_token', resData.token);
      }
      return resData.activeChild;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to switch child profile.');
    }
  }
);

export const logoutParent = createAsyncThunk('parentAuth/logoutParent', async () => {
  try {
    await parentLogoutApi();
  } catch (e) {
    // Ignore network errors during logout
  } finally {
    localStorage.removeItem('parent_token');
  }
});

const hasParentToken = typeof window !== 'undefined' ? Boolean(localStorage.getItem('parent_token')) : false;

const parentAuthSlice = createSlice({
  name: 'parentAuth',
  initialState: {
    parent: null,
    activeChild: null,
    children: [],
    isAuthenticated: false,
    loading: false,
    checkingAuth: hasParentToken,
    error: null,
  },
  reducers: {
    clearParentAuthError: (state) => {
      state.error = null;
    },
    updateParentState: (state, action) => {
      state.parent = { ...state.parent, ...action.payload };
    },
    setActiveChild: (state, action) => {
      state.activeChild = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginParent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginParent.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.checkingAuth = false;
        state.parent = action.payload.parent;
        state.children = action.payload.parent?.children || [];
        state.activeChild = action.payload.parent?.activeChild || (action.payload.parent?.children?.[0] ?? null);
        state.error = null;
      })
      .addCase(loginParent.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.checkingAuth = false;
        state.error = action.payload;
      })
      // Check Auth
      .addCase(checkParentAuth.pending, (state) => {
        state.checkingAuth = true;
      })
      .addCase(checkParentAuth.fulfilled, (state, action) => {
        state.checkingAuth = false;
        state.isAuthenticated = true;
        state.parent = action.payload;
        state.children = action.payload?.children || [];
        state.activeChild = action.payload?.activeChild || (action.payload?.children?.[0] ?? null);
      })
      .addCase(checkParentAuth.rejected, (state) => {
        state.checkingAuth = false;
        state.isAuthenticated = false;
        state.parent = null;
        state.children = [];
        state.activeChild = null;
      })
      // Switch Child
      .addCase(switchStudent.fulfilled, (state, action) => {
        state.activeChild = action.payload;
      })
      // Logout
      .addCase(logoutParent.fulfilled, (state) => {
        state.parent = null;
        state.children = [];
        state.activeChild = null;
        state.isAuthenticated = false;
        state.checkingAuth = false;
        state.error = null;
      });
  },
});

export const { clearParentAuthError, updateParentState, setActiveChild } = parentAuthSlice.actions;
export default parentAuthSlice.reducer;
