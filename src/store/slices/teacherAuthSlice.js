import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { teacherLoginApi, getTeacherProfileApi, teacherLogoutApi } from '../../api/teacherAuth.api';

// Async Thunks
export const loginTeacher = createAsyncThunk(
  'teacherAuth/loginTeacher',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await teacherLoginApi(credentials);
      const resData = response.data?.data || response.data || {};
      const token = resData.token;
      const teacher = resData.teacher;

      if (token) {
        localStorage.setItem('teacher_token', token);
        localStorage.removeItem('admin_token');
        localStorage.removeItem('parent_token');
      }
      return { teacher, token };
    } catch (error) {
      if (!error.response) {
        return rejectWithValue('Network error: Unable to reach backend server. Please verify server connection.');
      }
      return rejectWithValue(error.response?.data?.message || 'Login failed. Please check teacher credentials.');
    }
  }
);

export const checkTeacherAuth = createAsyncThunk(
  'teacherAuth/checkTeacherAuth',
  async (_, { rejectWithValue }) => {
    try {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const hasTeacherToken = typeof window !== 'undefined' ? localStorage.getItem('teacher_token') : null;
      const isProtectedTeacherPath = currentPath.startsWith('/teacher') && !currentPath.startsWith('/teacheraccount') && !currentPath.startsWith('/teacher/login');

      if (!isProtectedTeacherPath && !hasTeacherToken) {
        return rejectWithValue('No active teacher session');
      }

      const response = await getTeacherProfileApi();
      const resData = response.data?.data || response.data || {};
      return resData.teacher || resData;
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('teacher_token');
      }
      return rejectWithValue('Teacher session invalid or expired');
    }
  }
);

export const logoutTeacher = createAsyncThunk('teacherAuth/logoutTeacher', async () => {
  try {
    await teacherLogoutApi();
  } catch (e) {
    // Ignore network errors during logout
  } finally {
    localStorage.removeItem('teacher_token');
  }
});

const hasTeacherToken = typeof window !== 'undefined' ? Boolean(localStorage.getItem('teacher_token')) : false;

const teacherAuthSlice = createSlice({
  name: 'teacherAuth',
  initialState: {
    teacher: null,
    isAuthenticated: false,
    loading: false,
    checkingAuth: hasTeacherToken,
    error: null,
  },
  reducers: {
    clearTeacherAuthError: (state) => {
      state.error = null;
    },
    updateTeacherState: (state, action) => {
      state.teacher = { ...state.teacher, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Login Action
      .addCase(loginTeacher.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginTeacher.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.checkingAuth = false;
        state.teacher = action.payload.teacher;
        state.error = null;
      })
      .addCase(loginTeacher.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.checkingAuth = false;
        state.error = action.payload;
      })
      // Check Auth Session
      .addCase(checkTeacherAuth.pending, (state) => {
        state.checkingAuth = true;
      })
      .addCase(checkTeacherAuth.fulfilled, (state, action) => {
        state.checkingAuth = false;
        state.isAuthenticated = true;
        state.teacher = action.payload;
      })
      .addCase(checkTeacherAuth.rejected, (state) => {
        state.checkingAuth = false;
        state.isAuthenticated = false;
        state.teacher = null;
      })
      // Logout Action
      .addCase(logoutTeacher.fulfilled, (state) => {
        state.teacher = null;
        state.isAuthenticated = false;
        state.checkingAuth = false;
        state.error = null;
      });
  },
});

export const { clearTeacherAuthError, updateTeacherState } = teacherAuthSlice.actions;
export default teacherAuthSlice.reducer;
