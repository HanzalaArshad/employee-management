// src/pages/employee/leave/MyLeaves.tsx
import { Box, Typography, Chip, Button } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useGetProfileQuery, useGetLeavesQuery } from '../../../store/supabaseApi';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function MyLeaves() {
  const { data: profile } = useGetProfileQuery();
  const { data: leaves = [], isLoading } = useGetLeavesQuery({ employeeId: profile?.id });

  const columns = [
    { field: 'type', headerName: 'Type', width: 100 },
    { field: 'start_date', headerName: 'Date', width: 130, valueFormatter: (p) => format(new Date(p.value), 'dd MMM yyyy') },
    { field: 'status', headerName: 'Status', width: 120, renderCell: (p) => (
      <Chip label={p.value} color={p.value === 'approved' ? 'success' : p.value === 'rejected' ? 'error' : 'warning'} size="small" />
    )},
    { field: 'created_at', headerName: 'Applied', width: 150, valueFormatter: (p) => format(new Date(p.value), 'dd MMM yyyy') },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">My Leaves</Typography>
        <Button variant="contained" component={Link} to="/dashboard/employee/leave/apply">
          Apply Leave
        </Button>
      </Box>

      <Box sx={{ height: 500 }}>
        <DataGrid rows={leaves} columns={columns} loading={isLoading} getRowId={(r) => r.id} />
      </Box>
    </Box>
  );
}