// src/pages/employee/leave/ApplyLeave.tsx
import { useState } from 'react';
import { Box, TextField, Button, MenuItem, Alert, CircularProgress } from '@mui/material';
import { useGetProfileQuery, useApplyLeaveMutation } from '../../../store/supabaseApi';
import { useNavigate } from 'react-router-dom';

export default function ApplyLeave() {
  const { data: profile } = useGetProfileQuery();
  const [applyLeave, { isLoading }] = useApplyLeaveMutation();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    type: 'casual',
    start_date: '',
    reason: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!profile) {
      setError('Profile not loaded. Please refresh the page.');
      return;
    }

    if (!form.start_date || !form.reason.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    // Prevent past date submission
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(form.start_date);
    
    if (startDate < today) {
      setError('Cannot apply leave for past dates');
      return;
    }

    try {
      await applyLeave({
        employee_id: profile.id,
        type: form.type,
        start_date: form.start_date,
        reason: form.reason.trim(),
      }).unwrap();

      setSuccess('Leave application submitted successfully!');
      setForm({ type: 'casual', start_date: '', reason: '' });
      
      setTimeout(() => {
        navigate('/dashboard/employee/leaves');
      }, 2000);
    } catch (err: any) {
      console.error('Leave application error:', err);
      
      // Handle duplicate leave error
      if (err?.code === 'DUPLICATE_LEAVE' || err?.message?.includes('already have a leave')) {
        setError('❌ You already have a leave application for this date. Please choose a different date.');
      } else if (err?.message) {
        setError(err.message);
      } else if (err?.error?.message) {
        setError(err.error.message);
      } else {
        setError('Failed to submit leave application. Please try again.');
      }
    }
  };

  if (!profile) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 3, boxShadow: 3, borderRadius: 2 }}>
      <h2>Apply for Leave</h2>
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <TextField
          select
          fullWidth
          label="Leave Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          margin="normal"
          required
        >
          <MenuItem value="casual">Casual</MenuItem>
          <MenuItem value="sick">Sick</MenuItem>
          <MenuItem value="annual">Annual</MenuItem>
          <MenuItem value="emergency">Emergency</MenuItem>
        </TextField>

        <TextField
          fullWidth
          label="Leave Date"
          type="date"
          value={form.start_date}
          onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          InputLabelProps={{ shrink: true }}
          inputProps={{ 
            min: new Date().toISOString().split('T')[0] 
          }}
          margin="normal"
          required
        />

        <TextField
          fullWidth
          label="Reason"
          multiline
          rows={3}
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          margin="normal"
          placeholder="Please provide a detailed reason for your leave request"
          required
        />

        <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
          <strong>Note:</strong> You can only apply one leave per date. Cannot apply for past dates.
        </Alert>

        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            type="submit" 
            disabled={isLoading || !form.start_date || !form.reason.trim()}
          >
            {isLoading ? 'Submitting...' : 'Apply'}
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => navigate(-1)}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </Box>
      </form>
    </Box>
  );
}