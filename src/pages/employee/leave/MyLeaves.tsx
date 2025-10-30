// src/pages/employee/leave/MyLeaves.tsx
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { DataGrid,type GridColDef } from '@mui/x-data-grid';
import { useGetProfileQuery, useGetLeavesQuery } from '../../../store/supabaseApi';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

// Safe formatter
const safeFormat = (dateString: string, fmt: string = 'dd MMM yyyy') => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '—' : format(date, fmt);
};

export default function MyLeaves() {
  const { data: profile } = useGetProfileQuery();
  const { data: leaves = [], isLoading } = useGetLeavesQuery({ employeeId: profile?.id });

  const columns: GridColDef[] = [
    { field: 'type', headerName: 'Type', width: 120 },
    {
      field: 'start_date',
      headerName: 'Date',
      width: 150,
      // valueGetter: (params) => safeFormat(params.value, 'dd MMM yyyy'),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const status = params.value;
        const color = status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'warning';
        return (
          <span style={{
            padding: '4px 8px',
            borderRadius: 4,
            backgroundColor: color === 'success' ? '#d4edda' : color === 'error' ? '#f8d7da' : '#fff3cd',
            color: color === 'success' ? '#155724' : color === 'error' ? '#721c24' : '#856404',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}>
            {status.toUpperCase()}
          </span>
        );
      },
    },
    {
      field: 'created_at',
      headerName: 'Applied',
      width: 150,
      valueGetter: (params) => safeFormat(params.value, 'dd MMM yyyy'),
    },
  ];

  if (isLoading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">My Leaves</Typography>
        <Button variant="contained" component={Link} to="/dashboard/employee/leave/apply">
          Apply Leave
        </Button>
      </Box>

      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={leaves}
          columns={columns}
          getRowId={(row) => row.id}
          loading={isLoading}
          pageSizeOptions={[5, 10, 20]}
          disableRowSelectionOnClick
        />
      </Box>
    </Box>
  );
}