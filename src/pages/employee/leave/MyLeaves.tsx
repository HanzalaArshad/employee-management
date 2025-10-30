// src/pages/employee/leave/MyLeaves.tsx
import { useState } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useGetProfileQuery, useGetLeavesQuery, useDeleteLeaveMutation } from '../../../store/supabaseApi';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';

// Safe formatter
const safeFormat = (dateString: string, fmt: string = 'dd MMM yyyy') => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '—' : format(date, fmt);
};

export default function MyLeaves() {
  const { data: profile } = useGetProfileQuery();
const { data: leaves = [], isLoading, refetch } = useGetLeavesQuery({ 
  employeeId: profile?.id 
});  const [deleteLeave, { isLoading: isDeleting }] = useDeleteLeaveMutation();

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; leaveId: string | null; leaveDate: string }>({
    open: false,
    leaveId: null,
    leaveDate: '',
  });

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleDeleteClick = (leaveId: string, leaveDate: string) => {
    setDeleteDialog({ open: true, leaveId, leaveDate });
  };

  const handleDeleteConfirm = async () => {
  if (!deleteDialog.leaveId) return;

  try {
    await deleteLeave(deleteDialog.leaveId).unwrap();
    
    // FORCE IMMEDIATE REFETCH
    await refetch();
    
    setAlert({ type: 'success', message: '✅ Leave deleted successfully!' });
    setDeleteDialog({ open: false, leaveId: null, leaveDate: '' });
    
    setTimeout(() => setAlert(null), 3000);
  } catch (err: any) {
    console.error('Delete leave error:', err);
    setAlert({ 
      type: 'error', 
      message: err?.message || 'Failed to delete leave. Please try again.' 
    });
  }
};

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, leaveId: null, leaveDate: '' });
  };

  const columns: GridColDef[] = [
    { 
      field: 'type', 
      headerName: 'Type', 
      width: 120,
    },
    {
      field: 'start_date',
      headerName: 'Date',
      width: 150,
    },
    {
      field: 'reason',
      headerName: 'Reason',
      width: 200,
      renderCell: (params) => (
        <span title={params.value}>
          {params.value?.length > 30 ? params.value.slice(0, 30) + '...' : params.value}
        </span>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const status = params.value;
        const color =
          status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'warning';
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
            {status?.toUpperCase()}
          </span>
        );
      },
    },
   
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => {
        const status = params.row.status;
        // Only allow delete for pending leaves
        if (status !== 'pending') return null;
        
        return (
          <IconButton
            color="error"
            size="small"
            onClick={() => handleDeleteClick(params.row.id, params.row.start_date)}
            title="Delete Leave"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        );
      },
    },
  ];

  if (isLoading)
    return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">My Leaves</Typography>
        <Button variant="contained" component={Link} to="/dashboard/employee/leave/apply">
          Apply Leave
        </Button>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {leaves.length === 0 ? (
        <Alert
          severity="info"
          sx={{
            mt: 4,
            textAlign: 'center',
            justifyContent: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          You have not applied for any leaves yet.
          <Button
            variant="contained"
            size="small"
            sx={{ mt: 2 }}
            component={Link}
            to="/dashboard/employee/leave/apply"
          >
            Apply Now
          </Button>
        </Alert>
      ) : (
        <>
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Note:</strong> You can only delete leaves that are in "Pending" status.
          </Alert>
          <Box sx={{ height: 500, width: '100%' }}>
            <DataGrid
              rows={leaves}
              columns={columns}
              getRowId={(row) => row.id}
              loading={isLoading}
              initialState={{
                pagination: { paginationModel: { pageSize: 5, page: 0 } },
                sorting: { sortModel: [{ field: 'created_at', sort: 'desc' }] },
              }}
              pageSizeOptions={[5, 10, 20]}
              disableRowSelectionOnClick
            />
          </Box>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Leave Application?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete your leave application for{' '}
            <strong>{safeFormat(deleteDialog.leaveDate)}</strong>?
            <br />
            <br />
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}