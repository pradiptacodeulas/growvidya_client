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
import GlobalConfirmModal from './components/common/GlobalConfirmModal';

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
    const handleNumberInputWheel = (event) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement &&
        target.type === 'number' &&
        document.activeElement === target
      ) {
        event.preventDefault();
        target.blur();
      }
    };

    document.addEventListener('wheel', handleNumberInputWheel, {
      capture: true,
      passive: false,
    });

    return () => {
      document.removeEventListener('wheel', handleNumberInputWheel, {
        capture: true,
      });
    };
  }, []);

  useEffect(() => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const isOnboardingOrCallback =
      currentPath.startsWith('/auth/callback') ||
      currentPath.startsWith('/register') ||
      currentPath.startsWith('/configure') ||
      currentPath.startsWith('/pricing') ||
      Boolean(searchParams?.get('registered') === '1');

    if (localStorage.getItem('admin_token') && !isOnboardingOrCallback) {
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
      <SubscriptionProvider>
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

        <GlobalConfirmModal />

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
      </SubscriptionProvider>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
