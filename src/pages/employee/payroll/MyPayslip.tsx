// src/pages/employee/payroll/MyPayslip.tsx
import { useState } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { useGetPayrollQuery, useExportPayslipPDFQuery } from '../../../store/supabaseApi';
import { useGetProfileQuery } from '../../../store/supabaseApi';
import { format } from 'date-fns';

export default function MyPayslip() {
  const { data: profile } = useGetProfileQuery();
  const [month, setMonth] = useState(new Date().toISOString().split('T')[0].substring(0, 7)); // YYYY-MM

  const { data: payroll, isLoading } = useGetPayrollQuery({ employeeId: profile?.id, month });
  const [exportPDF] = useExportPayslipPDFQuery();

  if (isLoading) return <CircularProgress />;

  if (!payroll) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No payslip for {month}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Payslip for {format(new Date(payroll.month), 'MMMM yyyy')}</Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          sx={{ mb: 2 }}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
        <Typography><strong>Base Salary:</strong> Rs{profile.salary}</Typography>
        <Typography><strong>Late Deduction:</strong> Rs{payroll.late_deduction.toFixed(0)}</Typography>
        <Typography><strong>Leave Deduction:</strong> Rs{payroll.leave_deduction.toFixed(0)}</Typography>
        <Typography><strong>Net Salary:</strong> Rs{payroll.net_salary.toFixed(0)}</Typography>
      </Box>

      <Button
        variant="contained"
        onClick={() => exportPDF({ payrollId: payroll.id })}
      >
        Download PDF
      </Button>
    </Box>
  );
}