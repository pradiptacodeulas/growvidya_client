import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminLoginApi, getAdminProfileApi, adminLogoutApi } from '../../api/adminAuth.api';

// Async Thunks
export const loginAdmin = createAsyncThunk(
  'auth/loginAdmin',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await adminLoginApi(credentials);
      return response.data; // { user } - HTTP cookie set by server
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Login failed. Please check credentials.');
    }
  }
);

export const checkAdminAuth = createAsyncThunk(
  'auth/checkAdminAuth',
  async (_, { rejectWithValue }) => {
    try {
      // Validate session via HTTP-only cookie automatically sent by browser
      const response = await getAdminProfileApi();
      return response.data?.user;
    } catch (error) {
      return rejectWithValue('Session invalid or expired');
    }
  }
);

export const logoutAdmin = createAsyncThunk('auth/logoutAdmin', async () => {
  try {
    await adminLogoutApi();
  } catch (e) {
    // Ignore network errors during logout
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: false,
    checkingAuth: true,
    error: null,
  },
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login Action
      .addCase(loginAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.error = action.payload;
      })
      // Check Auth Profile Action (Session validation on startup/page reload via HTTP-only cookie)
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
      // Logout Action
      .addCase(logoutAdmin.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;





