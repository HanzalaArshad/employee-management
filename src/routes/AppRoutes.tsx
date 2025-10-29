// src/routes/AppRoutes.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import DashboardLayout from '../pages/dashboard/Layout';
import EmployeeProfile from '../pages/employee/profile/profile';
import Employees from '../pages/admin/employee/Employees';
import EmployeeAttendance from '../pages/employee/attendance/attendance';
import AttendanceDashboard from '../pages/admin/attendance/AttendanceDashboard';
import { CircularProgress, Box, Typography } from '@mui/material';

const ProtectedRoute = ({
  children,
  adminOnly = false,
}: {
  children: JSX.Element;
  adminOnly?: boolean;
}) => {
  const { user, isRestoring } = useSelector((state: RootState) => state.auth);

  // While restoring session → show loader (no redirect flicker)
  if (isRestoring) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography variant="body1">Restoring session... Please wait</Typography>
      </Box>
    );
  }

  // No user → redirect to login
  if (!user) return <Navigate to="/login" replace />;

  // Admin-only route check
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard/employee/profile" replace />;
  }

  return children;
};

export const AppRoutes = () => (
  <Routes>
    {/* Public Routes */}
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />

    {/* Protected Dashboard */}
    <Route
      path="/dashboard/*"
      element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      {/* Default to Employee Profile */}
      <Route path="" element={<Navigate to="employee/profile" replace />} />
      <Route path="employee/profile" element={<EmployeeProfile />} />
      <Route path="employee/attendance" element={<EmployeeAttendance />} />

      {/* Admin-only routes */}
      <Route
        path="admin/employees"
        element={
          <ProtectedRoute adminOnly>
            <Employees />
          </ProtectedRoute>
        }
      />
      <Route
        path="admin/attendance"
        element={
          <ProtectedRoute adminOnly>
            <AttendanceDashboard />
          </ProtectedRoute>
        }
      />
    </Route>

    {/* Redirects */}
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);
