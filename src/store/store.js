import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import teacherAuthReducer from './slices/teacherAuthSlice';
import parentAuthReducer from './slices/parentAuthSlice';
import studentAuthReducer from './slices/studentAuthSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    teacherAuth: teacherAuthReducer,
    parentAuth: parentAuthReducer,
    studentAuth: studentAuthReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

