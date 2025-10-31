// src/pages/admin/employees/Employees.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid/models';
import {
  useGetEmployeesQuery,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} from '../../../store/supabaseApi';
import { formatPKR } from '../../../utils/formatters';
import Papa from 'papaparse';
import type { Employee } from '../../../types';
import { Delete as DeleteIcon } from '@mui/icons-material';

const schema = z.object({
  full_name: z.string().min(2, 'Full name required'),
  position: z.string().min(2, 'Position required'),
  salary: z.coerce.number().min(0, 'Salary must be ≥ 0'),
  phone: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.string().optional(),
  role: z.enum(['employee', 'admin'], { message: 'Invalid role' }),
});

type FormData = z.infer<typeof schema>;

export default function Employees() {
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [updateError, setUpdateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);


  const {
    data: employees = [],
    isLoading,
    refetch,
  } = useGetEmployeesQuery({ search, position: positionFilter });
  const [updateEmployee] = useUpdateEmployeeMutation();
  const [deleteEmployee] = useDeleteEmployeeMutation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setValue('full_name', emp.full_name ?? '');
    setValue('position', emp.position ?? '');
    setValue('salary', Number(emp.salary) || 0);
    setValue('phone', emp.phone ?? '');
    setValue('address', emp.address ?? '');
    setValue('date_of_birth', emp.date_of_birth ?? '');
    setValue('role', emp.role ?? 'employee');
    setUpdateError('');
    setOpenDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this employee?')) return;
    try {
      await deleteEmployee(id).unwrap();
      refetch();
    } catch (err: any) {
      console.error('DELETE FAILED →', err);
      alert(err?.data?.message || 'Delete failed');
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!editingEmployee) return;

    setIsSubmitting(true);
    setUpdateError('');

    const payload = {
      full_name: data.full_name,
      position: data.position,
      salary: Number(data.salary),
      phone: data.phone || null,
      address: data.address || null,
      date_of_birth: data.date_of_birth || null,
      role: data.role,
      updated_at: new Date().toISOString(),
    };


    try {
      await updateEmployee({ id: editingEmployee.id, ...payload }).unwrap();
      console.log('Update successful');
      setOpenDialog(false);
      reset();
      refetch();
    } catch (err: any) {
      console.error('UPDATE FAILED →', err);
      const msg = err?.data?.message || err?.message || 'Update failed';
      setUpdateError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    const csv = Papa.unparse(
      employees.map((e) => ({
        ...e,
        salary: formatPKR(e.salary ?? 0),
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: GridColDef[] = [
    { field: 'full_name', headerName: 'Name', flex: 1 },
    { field: 'position', headerName: 'Position', flex: 1 },
  {
    field: 'salary',
    headerName: 'Salary (PKR)',
    flex: 1,
  },
    { field: 'phone', headerName: 'Phone', flex: 1 },
    { field: 'role', headerName: 'Role', flex: 0.5 },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      renderCell: (params) => (
        <>
          <Button size="small" onClick={() => handleEdit(params.row as Employee)}>
            Edit
          </Button>
          <Button
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id as string)}
          >
            Delete
          </Button>
        </>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Employee Management
      </Typography>

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <TextField
          label="Search by Name"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <TextField
          label="Filter by Position"
          size="small"
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
        />
       
        <Button variant="outlined" onClick={handleExport}>
          Export CSV
        </Button>
      </Box>

      {updateError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUpdateError('')}>
          {updateError}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataGrid
          rows={employees}
          columns={columns}
          slots={{ toolbar: GridToolbar }}
          getRowId={(row) => row.id}
          initialState={{
            pagination: { paginationModel: { pageSize: 50 } },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          paginationMode="client"
          disableRowSelectionOnClick
          autoHeight
        />
      )}

      <Dialog
        open={openDialog}
        onClose={() => !isSubmitting && setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Full Name"
              {...register('full_name')}
              error={!!errors.full_name}
              helperText={errors.full_name?.message}
              sx={{ mb: 2 }}
              disabled={isSubmitting}
            />
            <TextField
              fullWidth
              label="Position"
              {...register('position')}
              error={!!errors.position}
              helperText={errors.position?.message}
              sx={{ mb: 2 }}
              disabled={isSubmitting}
            />
            <TextField
              fullWidth
              label="Salary (PKR)"
              type="number"
              {...register('salary', { valueAsNumber: true })}
              error={!!errors.salary}
              helperText={errors.salary?.message}
              sx={{ mb: 2 }}
              disabled={isSubmitting}
            />
            <TextField
              fullWidth
              label="Phone"
              {...register('phone')}
              sx={{ mb: 2 }}
              disabled={isSubmitting}
            />
            <TextField
              fullWidth
              label="Address"
              {...register('address')}
              sx={{ mb: 2 }}
              disabled={isSubmitting}
            />
            <TextField
              fullWidth
              label="Date of Birth (YYYY-MM-DD)"
              {...register('date_of_birth')}
              sx={{ mb: 2 }}
              disabled={isSubmitting}
            />
            <TextField
              select
              fullWidth
              label="Role"
              {...register('role')}
              error={!!errors.role}
              helperText={errors.role?.message}
              sx={{ mb: 2 }}
              disabled={isSubmitting}
            >
              <MenuItem value="employee">Employee</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
  <Button onClick={() => setOpenDialog(false)} disabled={isSubmitting}>
    Cancel
  </Button>

  {editingEmployee && (
    <IconButton
      color="error"
      size="small"
      onClick={() => setConfirmDeleteOpen(true)}
      title="Delete"
      disabled={isSubmitting}
    >
      <DeleteIcon fontSize="small" />
    </IconButton>
  )}

  <Button
    variant="contained"
    onClick={handleSubmit(onSubmit)}
    disabled={isSubmitting}
  >
    {isSubmitting ? 'Saving...' : 'Save'}
  </Button>
</DialogActions>

      </Dialog>
    </Box>
  );
}
