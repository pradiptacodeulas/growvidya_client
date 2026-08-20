import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchAcademicOverviewApi } from '../../api/adminAcademic.api';

export const fetchAcademicOverview = createAsyncThunk(
  'academic/fetchOverview',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchAcademicOverviewApi();
      return response.data; // { years, classes, sections, subjects, shifts, houses, periods }
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to load academic masters.');
    }
  }
);

const academicSlice = createSlice({
  name: 'academic',
  initialState: {
    years: [],
    classes: [],
    sections: [],
    subjects: [],
    shifts: [],
    houses: [],
    periods: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAcademicOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAcademicOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.years = action.payload.years || [];
        state.classes = action.payload.classes || [];
        state.sections = action.payload.sections || [];
        state.subjects = action.payload.subjects || [];
        state.shifts = action.payload.shifts || [];
        state.houses = action.payload.houses || [];
        state.periods = action.payload.periods || [];
      })
      .addCase(fetchAcademicOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default academicSlice.reducer;
