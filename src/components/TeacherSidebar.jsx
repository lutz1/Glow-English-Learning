import React, { useEffect, useState } from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Tooltip,
  IconButton,
  Divider,
  Typography,
  Avatar,
  useMediaQuery,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  PlayCircle as PlayCircleIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import FlipClock from "./FlipClock";

const drawerWidth = 240;

const TeacherSidebar = ({ open, onToggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [teacher, setTeacher] = useState(null);

  // 👩‍🏫 Fetch teacher data
  useEffect(() => {
    if (!currentUser?.uid) return;
    const userRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) setTeacher({ id: docSnap.id, ...docSnap.data() });
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) onToggleSidebar(); // Auto close sidebar on mobile
  };

  // ✅ Sidebar Menu Items
  const menuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/teacher/dashboard" },
    { text: "Start Session", icon: <PlayCircleIcon />, path: "/teacher/start-session" },
    { text: "My Profile", icon: <PersonIcon />, path: "/teacher/profile" },
    { text: "Settings", icon: <SettingsIcon />, path: "/teacher/settings" },
  ];

  const drawerContent = (
    <>
      {/* Header / Avatar Section */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          p: 2,
          mt: 1,
        }}
      >
        {open && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              ml: 1,
            }}
          >
            <Avatar
              src={teacher?.photoURL || undefined}
              sx={{
                width: 70,
                height: 70,
                mb: 1,
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                cursor: "pointer",
              }}
              onClick={() => handleNavigate("/teacher/profile")}
            >
              {!teacher?.photoURL && teacher?.name
                ? teacher.name[0].toUpperCase()
                : "T"}
            </Avatar>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              {teacher?.name ? `Teacher ${teacher.name}` : "Teacher"}
            </Typography>

            {/* ✅ FlipClock */}
            <Box sx={{ mt: 1 }}>
              <FlipClock />
            </Box>
          </Box>
        )}

        {/* Hide toggle icon on mobile/tablet */}
        {!isMobile && (
          <IconButton
            onClick={onToggleSidebar}
            color="inherit"
            size="small"
            sx={{
              "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
            }}
          >
            <MenuIcon />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.2)" }} />

      {/* Menu List */}
      <List>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Tooltip
              title={open ? "" : item.text}
              placement="right"
              key={item.text}
              arrow
            >
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                sx={{
                  color: "#fff",
                  backgroundColor: isActive
                    ? "rgba(255,255,255,0.25)"
                    : "transparent",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.15)" },
                }}
              >
                <ListItemIcon sx={{ color: "#fff", minWidth: open ? 40 : "auto" }}>
                  {item.icon}
                </ListItemIcon>
                {open && <ListItemText primary={item.text} />}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      {/* Footer */}
      {open && (
        <Typography
          variant="caption"
          sx={{
            position: "absolute",
            bottom: 16,
            left: 0,
            width: "100%",
            textAlign: "center",
            color: "rgba(255,255,255,0.8)",
          }}
        >
          © {new Date().getFullYear()} Teacher Portal
        </Typography>
      )}
    </>
  );

  return (
    <>
      {/* Floating Button for Mobile */}
      {isMobile && !open && (
        <IconButton
          onClick={onToggleSidebar}
          color="inherit"
          sx={{
            position: "fixed",
            top: 8,
            left: 8,
            zIndex: 2000,
            backgroundColor: "rgba(0, 0, 0, 0)",
            "&:hover": { backgroundColor: "rgba(255, 255, 255, 0)" },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Drawer */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={open}
        onClose={onToggleSidebar}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: open ? drawerWidth : 60,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: open ? drawerWidth : 60,
            transition: "width 0.3s ease",
            overflowX: "hidden",
            backdropFilter: "blur(15px)",
            background: "linear-gradient(135deg, #a29bfe, #74b9ff, #81ecec)",
            borderRight: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default TeacherSidebar;