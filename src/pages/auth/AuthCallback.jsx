import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginWithHandoverToken } from '../../store/slices/authSlice';
import { toast } from 'react-toastify';
import LoadingScreen from '../../components/common/LoadingScreen';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const executedRef = useRef(false);

  useEffect(() => {
    if (executedRef.current) return;
    executedRef.current = true;

    const token = searchParams.get('token');
    if (!token) {
      toast.error('No handover token provided. Please log in.');
      navigate('/account/login/adminlogin', { replace: true });
      return;
    }

    const exchangeToken = async () => {
      try {
        const result = await dispatch(loginWithHandoverToken(token));
        if (loginWithHandoverToken.fulfilled.match(result)) {
          toast.success('🎉 Welcome to Growvidya! Your school portal is ready.');
          navigate('/admin/dashboard', { replace: true });
        } else {
          toast.error(result.payload || 'Handover token expired. Please log in.');
          navigate('/account/login/adminlogin', { replace: true });
        }
      } catch (err) {
        toast.error('Authentication handover failed.');
        navigate('/account/login/adminlogin', { replace: true });
      }
    };

    exchangeToken();
  }, [searchParams, navigate, dispatch]);

  return <LoadingScreen message="Setting up your school portal session..." />;
};

export default AuthCallback;
