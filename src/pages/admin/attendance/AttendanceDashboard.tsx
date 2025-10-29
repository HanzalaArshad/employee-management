import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  Button,
} from "@mui/material";
import { DataGrid, type GridColDef, GridToolbar } from "@mui/x-data-grid";
import { format } from "date-fns";
import   Papa from "papaparse";
import {
  useGetEmployeesQuery,
  useGetAttendanceQuery,
} from "../../../store/supabaseApi";

const formatPakistanTime = (utcString: string | null) => {
  if (!utcString) return "—";
  
  try {
    const utcDate = new Date(utcString);
    
    const pktDate = new Date(utcDate.getTime() + (5 * 60 * 60 * 1000));
    
    return format(pktDate, "hh:mm a");
  } catch (error) {
    console.error("Error formatting time:", error);
    return "—";
  }
};

const getTodayPKT = () => {
  const now = new Date();
  const pktNow = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  return pktNow.toISOString().split('T')[0];
};

export default function AttendanceDashboard() {
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(getTodayPKT());

  const { data: employees = [], isLoading: loadingEmp } = useGetEmployeesQuery({});
  
  const { data: attendance = [], isLoading: loadingAtt, refetch } = useGetAttendanceQuery({
    startDate: dateFilter,
    endDate: dateFilter,
  });


const rows = useMemo(() => {
  console.log('========== ATTENDANCE DEBUG ==========');
  console.log('📊 Total employees:', employees.length);
  console.log('📊 Total attendance records:', attendance.length);
  console.log('📅 Date filter:', dateFilter);
  console.log('👥 Employees:', employees.map(e => ({ id: e.id, name: e.full_name })));
  console.log('✅ Attendance records:', attendance.map(a => ({
    employee_id: a.employee_id,
    check_in: a.check_in,
    check_out: a.check_out
  })));
  console.log('=====================================');
  
  return employees.map((emp) => {
    // Find today's attendance record for this employee
    const todayRecord = attendance.find(
      (a) => a.employee_id === emp.id
    );

    if (todayRecord) {
      console.log(`✅ Found attendance for ${emp.full_name}:`, {
        check_in: todayRecord.check_in,
        check_out: todayRecord.check_out
      });
    } else {
      console.log(`❌ No attendance found for ${emp.full_name} (ID: ${emp.id})`);
    }

    const checkInTime = todayRecord?.check_in 
      ? formatPakistanTime(todayRecord.check_in) 
      : "—";
    
    const checkOutTime = todayRecord?.check_out 
      ? formatPakistanTime(todayRecord.check_out) 
      : "—";

    const status = todayRecord ? "Present" : "Absent";
    const hoursWorked = todayRecord?.hours_worked || 0;
    const isLate = todayRecord?.is_late ? "Yes" : "No";

    return {
      id: emp.id,
      name: emp.full_name,
      position: emp.position || "—",
      status,
      check_in: checkInTime,
      check_out: checkOutTime,
      hours_worked: typeof hoursWorked === 'number' ? hoursWorked.toFixed(2) : '0.00',
      is_late: isLate,
    };
  });
}, [employees, attendance, dateFilter]);

  const filteredRows = rows.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchesPosition = positionFilter
      ? r.position.toLowerCase().includes(positionFilter.toLowerCase())
      : true;
    return matchesSearch && matchesPosition;
  });

  const handleExport = () => {
    const csv = Papa.unparse(filteredRows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${dateFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loadingEmp || loadingAtt) {
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress />
      </Box>
    );
  }

  const columns: GridColDef[] = [
    { field: "name", headerName: "Employee", flex: 1.2 },
    { field: "position", headerName: "Position", flex: 1 },
    { 
      field: "check_in", 
      headerName: "Check-In (PKT)", 
      flex: 1,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: params.value !== "—" ? 600 : 400 }}>
          {params.value}
        </Typography>
      )
    },
    { 
      field: "check_out", 
      headerName: "Check-Out (PKT)", 
      flex: 1,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: params.value !== "—" ? 600 : 400 }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: "hours_worked",
      headerName: "Hours Worked",
      flex: 1,
      renderCell: (params) => `${params.value} hrs`,
    },
    {
      field: "is_late",
      headerName: "Late?",
      flex: 0.7,
      renderCell: (params) => (
        <Box
          sx={{
            px: 1,
            py: 0.3,
            bgcolor: params.value === "Yes" ? "#FFEBEE" : "#E8F5E9",
            color: params.value === "Yes" ? "#C62828" : "#2E7D32",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          {params.value}
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      renderCell: (params) => (
        <Box
          sx={{
            px: 1.5,
            py: 0.4,
            bgcolor: params.value === "Present" ? "#C8E6C9" : "#FFCDD2",
            color: params.value === "Present" ? "#1B5E20" : "#B71C1C",
            borderRadius: "8px",
            textAlign: "center",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          {params.value}
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Attendance Dashboard
      </Typography>

      {/* ✅ Filters */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <TextField
          label="Date"
          type="date"
          size="small"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 180 }}
        />
        
        <TextField
          label="Search by Name"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 200 }}
        />
        
        <TextField
          label="Filter by Position"
          size="small"
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          sx={{ width: 200 }}
        />

        <Button variant="contained" onClick={handleExport}>
          Export CSV
        </Button>
        
        <Button variant="outlined" onClick={() => refetch()}>
          Refresh
        </Button>
      </Box>

      {/* ✅ Summary Stats */}
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <Box
          sx={{
            p: 2,
            bgcolor: "#E3F2FD",
            borderRadius: 2,
            flex: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Total Employees
          </Typography>
          <Typography variant="h5" fontWeight="bold">
            {filteredRows.length}
          </Typography>
        </Box>
        
        <Box
          sx={{
            p: 2,
            bgcolor: "#E8F5E9",
            borderRadius: 2,
            flex: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Present
          </Typography>
          <Typography variant="h5" fontWeight="bold" color="success.main">
            {filteredRows.filter((r) => r.status === "Present").length}
          </Typography>
        </Box>
        
        <Box
          sx={{
            p: 2,
            bgcolor: "#FFEBEE",
            borderRadius: 2,
            flex: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Absent
          </Typography>
          <Typography variant="h5" fontWeight="bold" color="error.main">
            {filteredRows.filter((r) => r.status === "Absent").length}
          </Typography>
        </Box>
        
        <Box
          sx={{
            p: 2,
            bgcolor: "#FFF3E0",
            borderRadius: 2,
            flex: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Late
          </Typography>
          <Typography variant="h5" fontWeight="bold" color="warning.main">
            {filteredRows.filter((r) => r.is_late === "Yes").length}
          </Typography>
        </Box>
      </Box>

      {/* ✅ Data Table */}
      <DataGrid
        autoHeight
        rows={filteredRows}
        columns={columns}
        getRowId={(r) => r.id}
        disableRowSelectionOnClick
        slots={{ toolbar: GridToolbar }}
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{
          pagination: { paginationModel: { pageSize: 25 } },
        }}
        sx={{
          '& .MuiDataGrid-cell': {
            py: 1.5,
          },
        }}
      />
    </Box>
  );
}