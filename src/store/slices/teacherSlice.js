import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchTeachersApi } from '../../api/adminTeacher.api';

export const fetchTeachers = createAsyncThunk(
  'teacher/fetchTeachers',
  async (params, { rejectWithValue }) => {
    try {
      const response = await fetchTeachersApi(params);
      const teachers = response?.data?.teachers || response?.data || response || [];
      return Array.isArray(teachers) ? teachers : [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to load teachers.');
    }
  }
);

const teacherSlice = createSlice({
  name: 'teacher',
  initialState: {
    teachers: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeachers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeachers.fulfilled, (state, action) => {
        state.loading = false;
        state.teachers = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchTeachers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.teachers = [];
      });
  },
});

export default teacherSlice.reducer;
