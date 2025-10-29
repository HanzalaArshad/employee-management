// src/pages/auth/ConfirmEmail.tsx
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get('type');
  const token = searchParams.get('token');

  useEffect(() => {
    if (type === 'signup' && token) {
      const verify = async () => {
        const { error } = await supabase.auth.verifyOtp({
          type,
          token,
        });
        if (error) {
          console.error('Verification error:', error);
        } else {
          navigate('/login', { replace: true });  // Redirect to login
        }
      };
      verify();
    }
  }, [type, token, navigate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8 }}>
      <CircularProgress />
      <Typography variant="h6" sx={{ mt: 2 }}>Verifying email...</Typography>
      <Alert severity="info" sx={{ mt: 2 }}>If not redirected, <a href="/login">go to login</a>.</Alert>
    </Box>
  );
}