import { useState } from 'react';
import { Box, Typography, Button, TextField } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import {
  useGetPayrollQuery,
  useGeneratePayrollMutation,
  useApprovePayrollMutation,
  useGetEmployeesQuery,
} from '../../../store/supabaseApi';

export default function PayrollDashboard() {
  const [month, setMonth] = useState(
    new Date().toISOString().split('T')[0].substring(0, 7)
  ); // YYYY-MM

  const { data: employees = [] } = useGetEmployeesQuery({});
  const { data: payrolls = [], isLoading } = useGetPayrollQuery({ month });

  const [generatePayroll] = useGeneratePayrollMutation();
  const [approvePayroll] = useApprovePayrollMutation();

  const handleGenerate = async () => {
    if (!employees.length) return;
    for (const emp of employees) {
      await generatePayroll({ employeeId: emp.id, month });
    }
  };

  const handleApprove = (id: string) => {
    approvePayroll({ id });
  };

  const mergedPayrolls = payrolls.map((p) => ({
    ...p,
    full_name: p.employees?.full_name || '—',
    position: p.employees?.position || '—',
    join_date: p.employees?.join_date || '—',
  }));

  const handleEdit = (row: any) => {
    console.log('Edit payroll:', row);
  };

  const handleDelete = (id: string) => {
    console.log('Delete payroll id:', id);
  };

  const columns: GridColDef[] = [
    { field: 'full_name', headerName: 'Name', flex: 1 },
    { field: 'position', headerName: 'Position', flex: 1 },
    { field: 'join_date', headerName: 'Join Date', flex: 1 },
    { field: 'salary', headerName: 'Salary (PKR)', flex: 1 },
    { field: 'phone', headerName: 'Phone', flex: 1 },
    { field: 'role', headerName: 'Role', flex: 1 },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 1,
      renderCell: (params) => (
        <>
          <Button size="small" onClick={() => handleEdit(params.row)}>
            Edit
          </Button>
          <Button
            size="small"
            color="error"
            onClick={() => handleDelete(params.row.id)}
          >
            Delete
          </Button>
          <Button
            size="small"
            color="success"
            onClick={() => handleApprove(params.row.id)}
          >
            Approve
          </Button>
        </>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Payroll Dashboard
      </Typography>

      <TextField
        label="Month"
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        sx={{ mb: 2, mr: 2 }}
      />

      <Button
        variant="contained"
        onClick={handleGenerate}
        disabled={isLoading || !employees.length}
      >
        Generate Payroll
      </Button>

      <Box sx={{ height: 600, mt: 3 }}>
        <DataGrid
          rows={mergedPayrolls}
          columns={columns}
          getRowId={(r) => r.id}
          loading={isLoading}
          initialState={{
            pagination: { paginationModel: { pageSize: 50 } },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          paginationMode="client"
          disableRowSelectionOnClick
        />
      </Box>
    </Box>
  );
}
