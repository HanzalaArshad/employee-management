// src/pages/employee/leave/ApplyLeave.tsx
import { useState } from 'react';
import { Box, TextField, Button, MenuItem, Alert, CircularProgress } from '@mui/material';
import { useGetProfileQuery, useApplyLeaveMutation } from '../../../store/supabaseApi';
import { useNavigate } from 'react-router-dom';

export default function ApplyLeave() {
  const { data: profile } = useGetProfileQuery();
  const [applyLeave, { isLoading, isSuccess, error }] = useApplyLeaveMutation();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    type: 'casual',
    start_date: '',
    reason: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    await applyLeave({
      employee_id: profile.id,
      ...form,
    });
    if (!error) navigate('/dashboard/employee/leaves');
  };

  if (!profile) return <CircularProgress />;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 3, boxShadow: 3, borderRadius: 2 }}>
      <h2>Apply for Leave</h2>
      {isSuccess && <Alert severity="success">Leave applied!</Alert>}
      {error && <Alert severity="error">{(error as any)?.data?.message || 'Failed'}</Alert>}

      <form onSubmit={handleSubmit}>
        <TextField
          select
          fullWidth
          label="Leave Type"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as any })}
          margin="normal"
        >
          <MenuItem value="casual">Casual</MenuItem>
          <MenuItem value="sick">Sick</MenuItem>
          <MenuItem value="annual">Annual</MenuItem>
        </TextField>

        <TextField
          fullWidth
          label="Date"
          type="date"
          value={form.start_date}
          onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          InputLabelProps={{ shrink: true }}
          margin="normal"
        />

        <TextField
          fullWidth
          label="Reason"
          multiline
          rows={3}
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          margin="normal"
        />

        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button variant="contained" type="submit" disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Apply'}
          </Button>
          <Button variant="outlined" onClick={() => navigate(-1)}>Cancel</Button>
        </Box>
      </form>
    </Box>
  );
}