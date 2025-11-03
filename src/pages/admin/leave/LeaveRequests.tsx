import { Box, Typography, Chip, IconButton, Tabs, Tab } from '@mui/material';
import { Check, X } from '@mui/icons-material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import {
  useGetLeavesQuery,
  useUpdateLeaveStatusMutation,
} from '../../../store/supabaseApi';
import { useGetProfileQuery } from '../../../store/supabaseApi';
import { useState } from 'react';

export default function LeaveRequests() {
  const { data: admin } = useGetProfileQuery();
  const [tab, setTab] = useState(0);

  const { data: allLeaves = [], isLoading: allLoading } = useGetLeavesQuery({});
  const { data: pendingLeaves = [], isLoading: pendingLoading } =
    useGetLeavesQuery({ status: 'pending' });

  const [updateStatus] = useUpdateLeaveStatusMutation();

  const handleAction = (id: string, status: 'approved' | 'rejected') => {
    updateStatus({ id, status, approved_by: admin!.id });
  };

  const columns: GridColDef[] = [
    {
      field: 'full_name',
      headerName: 'Name',
      width: 160,
      valueGetter: (value, row) => row.employees?.full_name || 'N/A',
    },
    {
      field: 'position',
      headerName: 'Position',
      width: 140,
      valueGetter: (value, row) => row.employees?.position || 'N/A',
    },
    { field: 'type', headerName: 'Type', width: 100 },
    { field: 'start_date', headerName: 'Date', width: 150 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const status = params.value;
        const color =
          status === 'approved'
            ? 'success'
            : status === 'rejected'
              ? 'error'
              : 'warning';
        return (
          <span
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              backgroundColor:
                color === 'success'
                  ? '#d4edda'
                  : color === 'error'
                    ? '#f8d7da'
                    : '#fff3cd',
              color:
                color === 'success'
                  ? '#155724'
                  : color === 'error'
                    ? '#721c24'
                    : '#856404',
              fontSize: '0.75rem',
              fontWeight: 500,
            }}
          >
            {status.toUpperCase()}
          </span>
        );
      },
    },
    {
      field: 'approver',
      headerName: 'Approved By',
      width: 150,
      renderCell: (p) => {
        const approverName = p.row.approver?.full_name || '-';
        if (p.row.status === 'pending') {
          return (
            <Box>
              <IconButton
                size="small"
                color="success"
                onClick={() => handleAction(p.row.id, 'approved')}
              >
                <Check />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleAction(p.row.id, 'rejected')}
              >
                <X />
              </IconButton>
            </Box>
          );
        }
        return approverName;
      },
    },
  ];

  const loading = tab === 0 ? pendingLoading : allLoading;
  const data = tab === 0 ? pendingLeaves : allLeaves;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Leave Management
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Pending Requests" />
        <Tab label="All Leaves" />
      </Tabs>

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={data}
          columns={columns}
          getRowId={(r) => r.id}
          loading={loading}
          pageSizeOptions={[5, 10, 20]}
        />
      </Box>
    </Box>
  );
}
