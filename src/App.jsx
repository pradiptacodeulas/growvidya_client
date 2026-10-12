import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/custom-toast.css';
import './styles/datatable.css';

import { store } from './store/store';
import { checkAdminAuth } from './store/slices/authSlice';
import { checkTeacherAuth } from './store/slices/teacherAuthSlice';
import { checkParentAuth } from './store/slices/parentAuthSlice';
import { checkStudentAuth } from './store/slices/studentAuthSlice';
import { SubscriptionProvider } from './context/SubscriptionContext';
import LoadingScreen from './components/common/LoadingScreen';

import { publicRoutes } from './routes/public.routes';
import { adminRoutes } from './routes/admin.routes';
import { teacherRoutes } from './routes/teacher.routes';
import { parentRoutes } from './routes/parent.routes';
import { studentRoutes } from './routes/student.routes';
import { legacyRedirectRoutes } from './routes/legacyRedirects.routes';

const NotFound = lazy(() => import('./pages/NotFound'));

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    if (localStorage.getItem('admin_token')) {
      dispatch(checkAdminAuth());
    }
    if (localStorage.getItem('teacher_token')) {
      dispatch(checkTeacherAuth());
    }
    if (localStorage.getItem('parent_token')) {
      dispatch(checkParentAuth());
    }
    if (localStorage.getItem('student_token')) {
      dispatch(checkStudentAuth());
    }
  }, [dispatch]);

  return (
    <Router>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {publicRoutes}
          {adminRoutes}
          {teacherRoutes}
          {parentRoutes}
          {studentRoutes}
          {legacyRedirectRoutes}

          {/* 404 Not Found Page */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        limit={3}
      />
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <SubscriptionProvider>
        <AppContent />
      </SubscriptionProvider>
    </Provider>
  );
}

export default App;
