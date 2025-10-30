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
import ApplyLeave from '../pages/employee/leave/ApplyLeave';
import MyLeaves from '../pages/employee/leave/MyLeaves';
import LeaveRequests from '../pages/admin/leave/LeaveRequests';

const ProtectedRoute = ({
  children,
  adminOnly = false,
}: {
  children: JSX.Element;
  adminOnly?: boolean;
}) => {
  const { user } = useSelector((state: RootState) => state.auth);

 
  if (!user) return <Navigate to="/login" replace />;

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard/employee/profile" replace />;
  }

  return children;
};

export const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />

    <Route
      path="/dashboard/*"
      element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }
    >
      <Route path="" element={<Navigate to="employee/profile" replace />} />

      <Route path="employee/profile" element={<EmployeeProfile />} />
      <Route path="employee/attendance" element={<EmployeeAttendance />} />
      <Route path="employee/leaves" element={<MyLeaves />} />
      <Route path="employee/leave/apply" element={<ApplyLeave />} />

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
      <Route
        path="admin/leaves"
        element={
          <ProtectedRoute adminOnly>
            <LeaveRequests />
          </ProtectedRoute>
        }
      />
    </Route>

    
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);