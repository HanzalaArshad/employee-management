// src/pages/admin/payroll/PayrollDashboard.tsx
import { useState } from 'react';
import { Box, Typography, Button, TextField } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import {
  useGetPayrollQuery,
  useGeneratePayrollMutation,
  useApprovePayrollMutation,
} from '../../../store/supabaseApi';
import { useGetEmployeesQuery } from '../../../store/supabaseApi';

export default function PayrollDashboard() {
  const [month, setMonth] = useState(
    new Date().toISOString().split('T')[0].substring(0, 7)
  ); // YYYY-MM

  const { data: employees } = useGetEmployeesQuery({});
  const { data: payrolls = [], isLoading } = useGetPayrollQuery({ month });
  const [generatePayroll] = useGeneratePayrollMutation();
  const [approvePayroll] = useApprovePayrollMutation();

  const handleGenerate = async () => {
    if (!employees) return;
    for (const emp of employees) {
      await generatePayroll({ employeeId: emp.id, month });
    }
  };

  const handleApprove = (id: string) => {
    approvePayroll({ id });
  };

  const columns: GridColDef[] = [
    { field: 'employees.full_name', headerName: 'Name', width: 180 },
    { field: 'base_salary', headerName: 'Base', width: 100 },
    { field: 'late_deduction', headerName: 'Late Deduction', width: 120 },
    { field: 'leave_deduction', headerName: 'Leave Deduction', width: 120 },
    { field: 'net_salary', headerName: 'Net', width: 100 },
    { field: 'status', headerName: 'Status', width: 100 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      renderCell: (params) =>
        params.row.status === 'draft' && (
          <Button size="small" onClick={() => handleApprove(params.row.id)}>
            Approve
          </Button>
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
        sx={{ mb: 2 }}
      />

      <Button variant="contained" onClick={handleGenerate} disabled={isLoading}>
        Generate Payroll
      </Button>

      <Box sx={{ height: 600, mt: 2 }}>
        <DataGrid
          rows={payrolls}
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
