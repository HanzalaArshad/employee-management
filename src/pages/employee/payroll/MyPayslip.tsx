import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
} from '@mui/material';
import {
  useGetPayslipQuery,
  useExportPayslipPDFMutation,
} from '../../../store/supabaseApi';
import { useGetProfileQuery } from '../../../store/supabaseApi';
import { format } from 'date-fns';

export default function MyPayslip() {
  const { data: profile } = useGetProfileQuery();
  const [month, setMonth] = useState(
    new Date().toISOString().split('T')[0].substring(0, 7)
  ); // YYYY-MM

  const { data: payslip, isLoading: payslipLoading } = useGetPayslipQuery({
    employeeId: profile?.id,
    month: `${month}-01`,
  });

  const [exportPDF, { isLoading: pdfLoading, error: pdfError }] =
    useExportPayslipPDFMutation();

  const handleDownloadPDF = async () => {
    if (!payslip?.id) return;
    try {
      const pdfUrl = await exportPDF({ payrollId: payslip.id }).unwrap();
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `payslip-${month}.pdf`;
      link.click();
      URL.revokeObjectURL(pdfUrl);
    } catch (err) {
      console.error('PDF download error:', err);
    }
  };

  if (payslipLoading) {
    return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 4 }} />;
  }

  if (!payslip) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>
          No payslip for {month}.{' '}
          <Button
            onClick={() =>
              setMonth(new Date().toISOString().split('T')[0].substring(0, 7))
            }
          >
            Current Month
          </Button>
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Payslip for {format(new Date(payslip.month), 'MMMM yyyy')}
      </Typography>

      <TextField
        fullWidth
        label="Month"
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Box
        sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}
      >
        <Typography>
          <strong>Base Salary:</strong> Rs{payslip.base_salary.toFixed(0)}
        </Typography>
        <Typography>
          <strong>Late Deduction:</strong> Rs{payslip.late_deduction.toFixed(0)}
        </Typography>
        <Typography>
          <strong>Leave Deduction:</strong> Rs
          {payslip.leave_deduction.toFixed(0)}
        </Typography>
        <Typography>
          <strong>Net Salary:</strong> Rs{payslip.net_salary.toFixed(0)}
        </Typography>
      </Box>

      <Button
        variant="contained"
        onClick={handleDownloadPDF}
        disabled={pdfLoading}
      >
        {pdfLoading ? 'Generating...' : 'Download PDF'}
      </Button>

      {pdfError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {(pdfError as any)?.data?.message || 'PDF generation failed'}
        </Alert>
      )}
    </Box>
  );
}
