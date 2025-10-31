import { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Divider,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  AccessTime as AccessTimeIcon,
  Event as EventIcon,
  AttachMoney as AttachMoneyIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const drawerWidth = 240;

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user, signOut, isRestoring } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role;

 
const employeeMenu = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Profile', icon: <PersonIcon />, path: '/dashboard/employee/profile' },
  { text: 'Attendance', icon: <AccessTimeIcon />, path: '/dashboard/employee/attendance' },
  { text: 'My Leaves', icon: <EventIcon />, path: '/dashboard/employee/leaves' },
  { text: 'Payslip', icon: <AttachMoneyIcon />, path: '/dashboard/employee/payroll' },
];

const adminMenu = [
  { text: 'Employees', icon: <PeopleIcon />, path: '/dashboard/admin/employees' },
  { text: 'Admin Attendance', icon: <AccessTimeIcon />, path: '/dashboard/admin/attendance' },
  { text: 'Leave Requests', icon: <EventIcon />, path: '/dashboard/admin/leaves' },
  { text: 'Payroll Dashboard', icon: <AttachMoneyIcon />, path: '/dashboard/admin/payroll' },
];
  const menuItems = role === 'admin'
    ? [...employeeMenu, ...adminMenu]
    : employeeMenu;

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const drawer = (
    <Box>
      <Toolbar />
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  if (isRestoring) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 2 }}>
        <CircularProgress />
        <Typography variant="body1">Restoring session... Please wait</Typography>
      </Box>
    );
  }

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            HRM Dashboard
          </Typography>
          <Typography sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
            Welcome, {user.email}
          </Typography>
          <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}>
            {user.email?.[0]?.toUpperCase()}
          </Avatar>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 7, sm: 8 },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}