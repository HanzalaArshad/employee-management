// src/pages/auth/Login.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, TextField, Typography, Container, Alert, CircularProgress } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../../store/supabaseApi';
import { useDispatch } from 'react-redux';
import { setCredentials, setUser } from '../../store/authSlice';
import { supabase } from '../../utils/supabaseClient';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [login, { isLoading, error }] = useLoginMutation();
  const [resendLoading, setResendLoading] = React.useState(false);
  const [resendEmail, setResendEmail] = React.useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

const onSubmit = async (data: LoginForm) => {
  try {
    const result = await login(data).unwrap();
dispatch(
  setCredentials({
    user: result.user,
    token: result.token,
    refreshToken: result.refreshToken,
  })
);
    navigate('/dashboard/employee/profile');
  } catch (err) {
    console.error(err);
  }
};

  const handleResend = async () => {
    if (!resendEmail) return;
    setResendLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: resendEmail,
    });
    setResendLoading(false);
    if (error) {
      alert('Error resending: ' + error.message);
    } else {
      alert('Confirmation email resent! Check Gmail/spam.');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h4">HRM Login</Typography>
        {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
          {(error as any).data?.message || 'Login failed. Check email confirmation.'}
        </Alert>}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            autoComplete="email"
            autoFocus
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
          <Button fullWidth variant="outlined" sx={{ mt: 1 }} component={Link} to="/register">
            Don't have an account? Register
          </Button>
        </Box>

       
      </Box>
    </Container>
  );
}