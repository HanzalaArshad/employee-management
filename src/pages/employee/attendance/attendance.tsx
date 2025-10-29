// src/pages/employee/Attendance.tsx
import React from 'react';
import { Box, Typography, Button, Card, CardContent, Alert, CircularProgress } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useGetProfileQuery, useGetAttendanceQuery, useCheckInMutation, useCheckOutMutation } from '../../../store/supabaseApi';

export default function EmployeeAttendance() {
  const { data: profile, isLoading: profileLoading } = useGetProfileQuery();
  const pktToday = new Date(new Date().getTime() + 5 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const { data: attendance = [], isLoading: attLoading, refetch } = useGetAttendanceQuery(
    { employeeId: profile?.id, startDate: pktToday, endDate: pktToday },
    { skip: !profile }
  );
  
  const [checkIn, { isLoading: inLoading }] = useCheckInMutation();
  const [checkOut, { isLoading: outLoading }] = useCheckOutMutation();
  
  const todayEntry = attendance.length > 0 ? attendance[0] : null;
  const isCheckedIn = todayEntry && !todayEntry.check_out;

  const handleCheckIn = async () => {
    if (!profile?.id) {
      alert('Profile not loaded. Please refresh.');
      return;
    }
    try {
      await checkIn({ employeeId: profile.id }).unwrap();
      await refetch(); // Refresh data after check-in
    } catch (e: any) {
      console.error('Check-in error:', e);
      alert(e?.message || e?.data?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    if (!profile?.id) {
      alert('Profile not loaded. Please refresh.');
      return;
    }
    try {
      console.log('Attempting checkout for:', profile.id);
      const result = await checkOut({ employeeId: profile.id }).unwrap();
      console.log('Checkout successful:', result);
      await refetch(); // Refresh data after check-out
    } catch (e: any) {
      console.error('Checkout error:', e);
      // Better error message handling
      const errorMsg = e?.message || e?.data?.message || 'Checkout failed. Please refresh.';
      alert(errorMsg);
    }
  };

  if (profileLoading || attLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) {
    return <Typography>Profile not found</Typography>;
  }

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 3 }}>
      <Typography variant="h4" gutterBottom>My Attendance</Typography>
      <Card>
        <CardContent>
          <Alert severity={isCheckedIn ? 'info' : (todayEntry?.check_out ? 'success' : 'warning')}>
            {isCheckedIn
              ? `Checked In: ${new Date(todayEntry.check_in!).toLocaleTimeString()}`
              : todayEntry?.check_out
              ? `Checked Out: ${new Date(todayEntry.check_out).toLocaleTimeString()}`
              : 'Not checked in today'}
          </Alert>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<AccessTimeIcon />}
              disabled={isCheckedIn || inLoading}
              onClick={handleCheckIn}
            >
              {inLoading ? 'Checking in...' : 'Check In'}
            </Button>
            <Button
              variant="outlined"
              disabled={!isCheckedIn || outLoading}
              onClick={handleCheckOut}
            >
              {outLoading ? 'Checking out...' : 'Check Out'}
            </Button>
          </Box>
          
          {todayEntry && (
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography>
                <strong>Check In:</strong> {todayEntry.check_in ? new Date(todayEntry.check_in).toLocaleTimeString() : '—'}
              </Typography>
              <Typography>
                <strong>Check Out:</strong> {todayEntry.check_out ? new Date(todayEntry.check_out).toLocaleTimeString() : '—'}
              </Typography>
              <Typography>
                <strong>Hours Worked:</strong> {typeof todayEntry.hours_worked === 'number' ? todayEntry.hours_worked.toFixed(2) : '0.00'} hrs
              </Typography>
              <Typography>
                <strong>Late:</strong> {todayEntry.is_late ? 'Yes' : 'No'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}