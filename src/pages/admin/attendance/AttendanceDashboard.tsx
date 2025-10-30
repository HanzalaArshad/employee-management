// ✅ FIXED: AttendanceDashboard.tsx
import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  Button,
} from "@mui/material";
import { DataGrid, type GridColDef, GridToolbar } from "@mui/x-data-grid";
import Papa from "papaparse";
import {
  useGetEmployeesQuery,
  useGetAttendanceQuery,
} from "../../../store/supabaseApi";
// import { size } from "zod";

const formatPakistanTime = (utcString: string | null) => {
  if (!utcString) return "—";
  
  try {
    const utcDate = new Date(utcString);
    
    console.log('UTC String:', utcString);
    console.log('Parsed UTC:', utcDate.toISOString());
    console.log('UTC Hours:', utcDate.getUTCHours(), 'Minutes:', utcDate.getUTCMinutes());
    
   
    const pktTime = utcDate.toLocaleString('en-US', {
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    
    return pktTime;
  } catch (error) {
    console.error("Error formatting time:", error);
    return "—";
  }
};

const getTodayPKT = () => {
  const now = new Date();
  const pktOffset = 5 * 60 * 60 * 1000;
  const pktDate = new Date(now.getTime() + pktOffset);
  return pktDate.toISOString().split('T')[0];
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
  
    return employees.map((emp) => {
      const record = attendance.find((a) => a.employee_id === emp.id);

     

      const checkInTime = record?.check_in 
        ? formatPakistanTime(record.check_in) 
        : "—";
      
      const checkOutTime = record?.check_out 
        ? formatPakistanTime(record.check_out) 
        : "—";

      const status = record ? "Present" : "Absent";
      const hoursWorked = record?.hours_worked || 0;
      const isLate = record?.is_late ? "Yes" : "No";

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

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
      const matchesPosition = positionFilter
        ? r.position.toLowerCase().includes(positionFilter.toLowerCase())
        : true;
      return matchesSearch && matchesPosition;
    });
  }, [rows, search, positionFilter]);

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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  const columns: GridColDef[] = [
    { 
      field: "name", 
      headerName: "Employee Name", 
      flex: 1.2,
      minWidth: 180,

       renderCell: (params) => (
        <Typography  sx={{ 
          color: params.value !== "—" ?  "#000" : "#999",fontSize:'14px'
        }}>
          {params.value}
        </Typography>
      )
    },
    { 
      field: "position", 
      headerName: "Position", 
      flex: 1,
      minWidth: 150,
       renderCell: (params) => (
        <Typography  sx={{ 
          color: params.value !== "—" ?  "#000" : "#999",fontSize:'14px'
        }}>
          {params.value}
        </Typography>
      )
      
      
    },
    { 
      field: "check_in", 
      headerName: "Check-In (PKT)", 
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (
        <Typography  sx={{ 
          color: params.value !== "—" ?  "#1976d2" : "#999",fontSize:'14px'
        }}>
          {params.value}
        </Typography>
      )
    },
    { 
      field: "check_out", 
      headerName: "Check-Out (PKT)", 
      flex: 1,
      minWidth: 130,
      renderCell: (params) => (
      <Typography  sx={{ 
          color: params.value !== "—" ?  "#1976d2" : "#999",fontSize:'14px'
        }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: "hours_worked",
      headerName: "Hours",
      flex: 0.8,
      minWidth: 100,
      renderCell: (params) => (
        <Typography sx={{ fontWeight: 500 }}>
          {params.value} hrs
        </Typography>
      ),
    },
    {
      field: "is_late",
      headerName: "Late?",
      flex: 0.7,
      minWidth: 90,
      renderCell: (params) => (
        <Typography
          sx={{
            px: 1.5,
            py: 0.4,
            color: params.value === "Yes" ? "#C62828" : "#2E7D32",
            borderRadius: "6px",
            fontSize: "0.813rem",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.9,
      minWidth: 110,
      renderCell: (params) => (
        <Typography
          sx={{
            px: 1.5,
            py: 0.5,
            color: params.value === "Present" ? "#1B5E20" : "#B71C1C",
            borderRadius: "8px",
            textAlign: "center",
            fontWeight: 700,
            fontSize: "0.813rem",
          }}
        >
          {params.value}
        </Typography>
      ),
    },
  ];

  return (
    <Box sx={{ p:3 }}>
      <Typography variant="h3" gutterBottom fontWeight="bold">
        Attendance Dashboard
      </Typography>
    
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 3,
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
          label=" Search Employee"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Enter name..."
          sx={{ width: 200 }}
        />
        
        <TextField
          label=" Position"
          size="small"
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          placeholder="Filter by position"
          sx={{ width: 200 }}
        />

        <Button variant="contained" onClick={handleExport}>
           Export CSV
        </Button>
        
        <Button variant="outlined" onClick={() => refetch()}>
           Refresh
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <Box
          sx={{
            p: 2,
            bgcolor: "#f7fbffff",
            borderRadius: 2,
            flex: 1,
            minWidth: 150,
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
            bgcolor: "#f7fbffff",
            borderRadius: 2,
            flex: 1,
            minWidth: 150,
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
            bgcolor: "#f7fbffff",
            borderRadius: 2,
            flex: 1,
            minWidth: 150,
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
            bgcolor: "#f7fbffff",
            borderRadius: 2,
            flex: 1,
            minWidth: 150,
          }}
        >
          <Typography  color="text.secondary">
            Late
          </Typography>
          <Typography variant="h5" fontWeight="bold" color="warning.main">
            {filteredRows.filter((r) => r.is_late === "Yes").length}
          </Typography>
        </Box>
      </Box>

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
          '& .MuiDataGrid-row:hover': {
            bgcolor: '#f5f5f5',
          },
        }}
      />
    </Box>
  );
}