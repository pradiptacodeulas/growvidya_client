import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminLoginApi, verifyAdminOtpApi, getAdminProfileApi, adminLogoutApi, exchangeHandoverTokenApi } from '../../api/adminAuth.api';

export const clearAdminSessionStorage = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('admin_token');
  localStorage.removeItem('active_branch_id');
  localStorage.removeItem('active_branch_name');
};

const syncAdminSessionStorage = (token, user) => {
  if (typeof window === 'undefined' || !token) return;
  localStorage.setItem('admin_token', token);
  localStorage.removeItem('active_branch_name');

  const isSuperAdmin =
    Boolean(user?.isSuperAdmin) ||
    Number(user?.admin_type ?? user?.adminType) === 1 ||
    String(user?.roleName || user?.role_name || '').toLowerCase() === 'super admin';
  const userBranchId = user?.branch_id || user?.branchId;
  const userBranchName = user?.branch_name || user?.branchName;

  if (!isSuperAdmin && userBranchId) {
    localStorage.setItem('active_branch_id', String(userBranchId));
    if (userBranchName) {
      localStorage.setItem('active_branch_name', String(userBranchName));
    }
    window.dispatchEvent(
      new CustomEvent('branch_changed', {
        detail: { branchId: Number(userBranchId), branchName: userBranchName || null },
      })
    );
  } else {
    localStorage.setItem('active_branch_id', 'all');
    window.dispatchEvent(
      new CustomEvent('branch_changed', {
        detail: { branchId: null, branchName: null },
      })
    );
  }
};

// Async Thunks
export const loginWithHandoverToken = createAsyncThunk(
  'auth/loginWithHandoverToken',
  async (handoverToken, { rejectWithValue }) => {
    try {
      // Clear any previous school's admin token/branch before exchanging the handover token
      clearAdminSessionStorage();

      const response = await exchangeHandoverTokenApi(handoverToken);
      const resData = response.data || response || {};
      const token = resData.token;
      const user = resData.user;

      if (token) {
        syncAdminSessionStorage(token, user);
      }
      return { user, token };
    } catch (error) {
      if (!error.response) {
        return rejectWithValue('Network error: Unable to reach backend server.');
      }
      return rejectWithValue(error.response?.data?.message || 'Handover token exchange failed.');
    }
  }
);

export const loginAdmin = createAsyncThunk(
  'auth/loginAdmin',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await adminLoginApi(credentials);
      const resData = response.data?.data || response.data || {};
      const token = resData.token;
      const user = resData.user;

      if (token) {
        syncAdminSessionStorage(token, user);
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

export const loginAdminWithOtp = createAsyncThunk(
  'auth/loginAdminWithOtp',
  async ({ identifier, otp }, { rejectWithValue }) => {
    try {
      const response = await verifyAdminOtpApi(identifier, otp);
      const resData = response.data?.data || response.data || {};
      const token = resData.token;
      const user = resData.user;

      if (token) {
        syncAdminSessionStorage(token, user);
      }
      return { user, token };
    } catch (error) {
      if (!error.response) {
        return rejectWithValue('Network error: Unable to reach backend server. Please verify server connection.');
      }
      return rejectWithValue(error.response?.data?.message || 'Verification failed. Please check your 6-digit OTP.');
    }
  }
);

export const checkAdminAuth = createAsyncThunk(
  'auth/checkAdminAuth',
  async (_, { rejectWithValue, getState }) => {
    const tokenAtStart = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    try {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      if (
        currentPath.startsWith('/auth/callback') ||
        currentPath.startsWith('/register') ||
        currentPath.startsWith('/configure') ||
        currentPath.startsWith('/pricing')
      ) {
        return rejectWithValue({ ignore: true, message: 'Skipping checkAdminAuth on onboarding route' });
      }

      const isProtectedAdminPath =
        currentPath.startsWith('/admin') &&
        !currentPath.startsWith('/admin/login') &&
        currentPath !== '/account/login/adminlogin';

      if (!isProtectedAdminPath && !tokenAtStart) {
        return rejectWithValue('No active admin session');
      }

      const response = await getAdminProfileApi();
      const currentToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      if (tokenAtStart && currentToken && currentToken !== tokenAtStart) {
        // A newer login or handover token exchange completed while this check was in flight; keep the newer user in state
        const existingUser = getState()?.auth?.user;
        if (existingUser) return existingUser;
      }

      const resData = response.data?.data || response.data || {};
      const user = resData.user || resData;
      if (typeof window !== 'undefined' && user) {
        const userBranchId = user.branch_id || user.branchId;
        const userBranchName = user.branch_name || user.branchName;
        const isSuperAdmin =
          Boolean(user.isSuperAdmin) ||
          Number(user.admin_type ?? user.adminType) === 1 ||
          String(user.roleName || user.role_name || '').toLowerCase() === 'super admin';
        const existingBranch = localStorage.getItem('active_branch_id');
        if (!isSuperAdmin && userBranchId) {
          localStorage.setItem('active_branch_id', String(userBranchId));
          if (userBranchName) {
            localStorage.setItem('active_branch_name', String(userBranchName));
          } else {
            localStorage.removeItem('active_branch_name');
          }
        } else if (!existingBranch) {
          localStorage.setItem('active_branch_id', 'all');
          localStorage.removeItem('active_branch_name');
        }
      }
      return user;
    } catch (error) {
      if (typeof window !== 'undefined') {
        const currentToken = localStorage.getItem('admin_token');
        if (!currentToken || currentToken === tokenAtStart) {
          clearAdminSessionStorage();
        }
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
    clearAdminSessionStorage();
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
    resetAdminAuthState: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.checkingAuth = false;
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
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Handover Login
      .addCase(loginWithHandoverToken.pending, (state) => {
        state.loading = true;
        state.checkingAuth = true;
        state.error = null;
      })
      .addCase(loginWithHandoverToken.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.checkingAuth = false;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(loginWithHandoverToken.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.checkingAuth = false;
        state.error = action.payload;
      })
      // Login
      .addCase(loginAdminWithOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAdminWithOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.checkingAuth = false;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(loginAdminWithOtp.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.checkingAuth = false;
        state.error = action.payload;
      })
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
      .addCase(checkAdminAuth.rejected, (state, action) => {
        if (action.payload?.ignore) {
          state.checkingAuth = false;
          return;
        }
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

export const { clearAuthError, resetAdminAuthState, updateUserState, updateUserSchoolInfo } = authSlice.actions;
export default authSlice.reducer;
