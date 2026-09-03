import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { studentLoginApi, getStudentProfileApi, studentLogoutApi } from '../../api/studentAuth.api';

// Async Thunks
export const loginStudent = createAsyncThunk(
  'studentAuth/loginStudent',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await studentLoginApi(credentials);
      const resData = response.data?.data || response.data || {};
      const token = resData.token;
      const student = resData.student;

      if (token) {
        localStorage.setItem('student_token', token);
        localStorage.removeItem('parent_token');
        localStorage.removeItem('teacher_token');
        localStorage.removeItem('admin_token');
      }
      return { student, token };
    } catch (error) {
      if (!error.response) {
        return rejectWithValue('Network error: Unable to reach backend server. Please verify server connection.');
      }
      return rejectWithValue(error.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  }
);

export const checkStudentAuth = createAsyncThunk(
  'studentAuth/checkStudentAuth',
  async (_, { rejectWithValue }) => {
    try {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const hasStudentToken = typeof window !== 'undefined' ? localStorage.getItem('student_token') : null;
      const isProtectedStudentPath =
        currentPath.startsWith('/student') &&
        !currentPath.startsWith('/studentaccount') &&
        !currentPath.startsWith('/student/login');

      if (!isProtectedStudentPath && !hasStudentToken) {
        return rejectWithValue('No active student session');
      }

      const response = await getStudentProfileApi();
      const resData = response.data?.data || response.data || {};
      return resData.student || resData;
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('student_token');
      }
      return rejectWithValue('Student session invalid or expired');
    }
  }
);

export const logoutStudent = createAsyncThunk('studentAuth/logoutStudent', async () => {
  try {
    await studentLogoutApi();
  } catch (e) {
    // Ignore network errors
  } finally {
    localStorage.removeItem('student_token');
  }
});

const hasStudentToken = typeof window !== 'undefined' ? Boolean(localStorage.getItem('student_token')) : false;

const studentAuthSlice = createSlice({
  name: 'studentAuth',
  initialState: {
    student: null,
    isAuthenticated: false,
    loading: false,
    checkingAuth: hasStudentToken,
    error: null,
  },
  reducers: {
    clearStudentAuthError: (state) => {
      state.error = null;
    },
    updateStudentState: (state, action) => {
      state.student = { ...state.student, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // loginStudent
      .addCase(loginStudent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginStudent.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.student = action.payload.student;
        state.error = null;
      })
      .addCase(loginStudent.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.student = null;
        state.error = action.payload;
      })
      // checkStudentAuth
      .addCase(checkStudentAuth.pending, (state) => {
        state.checkingAuth = true;
      })
      .addCase(checkStudentAuth.fulfilled, (state, action) => {
        state.checkingAuth = false;
        state.isAuthenticated = true;
        state.student = action.payload;
        state.error = null;
      })
      .addCase(checkStudentAuth.rejected, (state) => {
        state.checkingAuth = false;
        state.isAuthenticated = false;
        state.student = null;
      })
      // logoutStudent
      .addCase(logoutStudent.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.student = null;
        state.checkingAuth = false;
        state.error = null;
      });
  },
});

export const { clearStudentAuthError, updateStudentState } = studentAuthSlice.actions;
export default studentAuthSlice.reducer;
