// src/pages/admin/leave/LeaveRequests.tsx
import { Box, Typography, Chip, IconButton } from '@mui/material';
import { Check, X } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useGetLeavesQuery, useUpdateLeaveStatusMutation } from '../../../store/supabaseApi';
import { useGetProfileQuery } from '../../../store/supabaseApi';
import { format } from 'date-fns';

export default function LeaveRequests() {
  const { data: admin } = useGetProfileQuery();
  const { data: leaves = [], isLoading } = useGetLeavesQuery({ status: 'pending' });
  const [updateStatus] = useUpdateLeaveStatusMutation();

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    if (!admin?.id) return;
    await updateStatus({ id, status, approved_by: admin.id });
  };

  const columns = [
    { field: 'employees.full_name', headerName: 'Employee', width: 180 },
    { field: 'type', headerName: 'Type', width: 100 },
    { field: 'start_date', headerName: 'Date', width: 140, valueFormatter: (p) => format(new Date(p.value), 'dd MMM yyyy') },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => (
      <Chip label={p.value} color={p.value === 'approved' ? 'success' : p.value === 'rejected' ? 'error' : 'warning'} size="small" />
    )},
    { field: 'actions', headerName: 'Actions', width: 120, renderCell: (params) => (
      params.row.status === 'pending' ? (
        <Box>
          <IconButton size="small" color="success" onClick={() => handleAction(params.row.id, 'approved')}>
            <Check />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => handleAction(params.row.id, 'rejected')}>
            <X />
          </IconButton>
        </Box>
      ) : null
    )},
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Leave Requests</Typography>
      <Box sx={{ height: 600 }}>
        <DataGrid rows={leaves} columns={columns} loading={isLoading} getRowId={(r) => r.id} />
      </Box>
    </Box>
  );
}