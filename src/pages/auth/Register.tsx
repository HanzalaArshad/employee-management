// src/pages/auth/Register.tsx (full updated)
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, TextField, Typography, Container, Alert, CircularProgress } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { useRegisterMutation } from '../../store/supabaseApi';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store/authSlice';

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Full name required'),
  position: z.string().min(2, 'Position required'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [register, { isLoading, error }] = useRegisterMutation();
  const [success, setSuccess] = React.useState(false);  // New: Success state

  const { register: reg, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
  try {
    const result = await register(data).unwrap();
    console.log('Register success:', result);  // Log for debug
    // Success message (optional—remove if not needed)
    alert('Registration successful! Redirecting to dashboard...');
    navigate('/dashboard/employee/profile');  // Direct dashboard (auto-logged in, profile par)
  } catch (err) {
    console.error(err);
    alert('Registration failed: ' + (err as any).data?.message || 'Try again');
  }
};

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h4">HRM Register</Typography>
        {success && <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
          Registration successful! Check your email for confirmation. Redirecting to login...
        </Alert>}
        {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
          {(error as any).data?.message || 'Registration failed. Try again.'}
        </Alert>}
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="full_name"
            label="Full Name"
            {...reg('full_name')}
            error={!!errors.full_name}
            helperText={errors.full_name?.message}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="position"
            label="Position"
            {...reg('position')}
            error={!!errors.position}
            helperText={errors.position?.message}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            autoComplete="email"
            autoFocus
            {...reg('email')}
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
            autoComplete="new-password"
            {...reg('password')}
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
            {isLoading ? <CircularProgress size={24} /> : 'Sign Up'}
          </Button>
          <Button fullWidth variant="outlined" sx={{ mt: 1 }} component={Link} to="/login">
            Already have an account? Login
          </Button>
        </Box>
      </Box>
    </Container>
  );
}