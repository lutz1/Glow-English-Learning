import React, { useEffect, useState } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Avatar,
  Badge,
  IconButton,
  Tooltip,
  Fade,
  Collapse,
} from "@mui/material";
import { styled } from "@mui/system";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import PaymentIcon from "@mui/icons-material/Payment";
import BarChartIcon from "@mui/icons-material/BarChart";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import { useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";

// 🔑 Styled component for rotating menu button
const RotatingIconButton = styled(IconButton)(({ collapsed }) => ({
  transition: "transform 0.4s ease",
  transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
}));

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [adminName, setAdminName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(
    () => JSON.parse(localStorage.getItem("sidebarCollapsed")) || false
  );

  // ✅ Sync collapsed state with localStorage
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  // ✅ Real-time admin profile listener
  useEffect(() => {
    let unsubscribeUser = () => {};
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);

        unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setAdminName(
              data.name || user.displayName || user.email.split("@")[0]
            );
            setPhotoURL(data.photoURL || user.photoURL || "");
          } else {
            const fallbackName =
              user.displayName || user.email.split("@")[0];
            setAdminName(
              fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1)
            );
            setPhotoURL(user.photoURL || "");
          }
        });
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUser();
    };
  }, []);

  // ✅ Real-time unread notifications count
  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      where("status", "==", "pending")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsub();
  }, []);

  // Navigation items
  const navItems = [
    {
      text: "Dashboard Overview",
      icon: <DashboardIcon />,
      path: "/admin/dashboard",
    },
    { text: "Teachers List", icon: <PeopleIcon />, path: "/admin/teachers" },
    { text: "For Payroll", icon: <PaymentIcon />, path: "/admin/payroll" },
    {
      text: "Teachers Performance",
      icon: <BarChartIcon />,
      path: "/admin/performance",
    },
    { text: "Events", icon: <CalendarTodayIcon />, path: "/admin/events" },
    {
      text: "Notifications",
      icon: (
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      ),
      path: "/admin/notifications",
    },
    { text: "Settings", icon: <SettingsIcon />, path: "/admin/settings" },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? 80 : 250,
        flexShrink: 0,
        transition: "width 0.4s ease",
        [`& .MuiDrawer-paper`]: {
          width: collapsed ? 80 : 250,
          transition: "width 0.4s ease",
          boxSizing: "border-box",
          background:
            "linear-gradient(160deg, rgba(44,62,80,0.95), rgba(52,73,94,0.92), rgba(44,62,80,0.95))",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          color: "#ecf0f1",
          borderRight: "1px solid rgba(255,255,255,0.1)",
          height: "100vh",
          overflow: "hidden", // Prevent overflow from scaling
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Profile Section */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 3,
          px: 2,
          background: "rgba(255, 255, 255, 0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          transition: "all 0.4s ease",
          flexShrink: 0,
        }}
      >
        <RotatingIconButton
          collapsed={collapsed ? 1 : 0}
          onClick={() => setCollapsed(!collapsed)}
          sx={{
            alignSelf: collapsed ? "center" : "flex-end",
            color: "#ecf0f1",
            mb: 2,
          }}
        >
          <MenuIcon />
        </RotatingIconButton>

        {/* Smooth collapse/expand with animation */}
        <Collapse in={!collapsed} timeout={400}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Avatar
              src={photoURL || undefined}
              sx={{
                width: 70,
                height: 70,
                mb: 1.5,
                bgcolor: "#3498db",
                fontWeight: "bold",
                boxShadow: "0px 4px 12px rgba(0,0,0,0.4)",
                transition: "all 0.3s ease",
              }}
            >
              {!photoURL && (adminName ? adminName[0].toUpperCase() : "A")}
            </Avatar>
            <Fade in={!collapsed} timeout={500}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  color: "#ecf0f1",
                  fontSize: "1.1rem",
                }}
              >
                {adminName}
              </Typography>
            </Fade>
            <Fade in={!collapsed} timeout={600}>
              <Typography
                variant="body2"
                sx={{
                  color: "#f1c40f",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  textTransform: "uppercase",
                  mt: 0.5,
                }}
              >
                Admin Panel
              </Typography>
            </Fade>
          </Box>
        </Collapse>
      </Box>

      {/* Navigation */}
      <List
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center", // Always center
          mt: 1,
          transition: "all 0.4s ease",
          flex: 1,
          overflowY: "auto",
          width: "100%",
          pr: 1,
        }}
      >
        {navItems.map(({ text, icon, path }, index) => (
          <Tooltip
            key={text}
            title={collapsed ? text : ""}
            placement="right"
          >
            <ListItem
              button
              onClick={() => navigate(path)}
              sx={{
                color: "#ecf0f1",
                borderRadius: "10px",
                width: collapsed ? "60%" : "calc(100% - 16px)",
                mb: 0.8,
                transition: "all 0.4s ease",
                justifyContent: collapsed ? "center" : "flex-start",
                alignItems: "center",
                display: "flex",
                overflow: "hidden",
                boxSizing: "border-box",
                alignSelf: "center",
                pl: collapsed ? 0 : 2,
                "&:hover": {
                  ...(collapsed
                    ? {} // No hover effect when collapsed
                    : {
                        bgcolor: "rgba(255, 255, 255, 0.2)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                        zIndex: 1,
                      }
                  ),
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color:
                    location.pathname === path
                      ? "#f1c40f"
                      : "rgba(255,255,255,0.7)",
                  minWidth: 0,
                  mr: collapsed ? 0 : 2,
                  transition: "all 0.4s ease, transform 0.3s",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  width: collapsed ? "100%" : "auto",
                  height: collapsed ? 40 : "auto",
                  fontSize: collapsed ? "2rem" : "inherit",
                  ...(collapsed && {
                    "&:hover": {
                      color: "#f1c40f",
                      transform: "rotate(-15deg) scale(1.1)", // icon animation on hover
                    },
                  }),
                }}
              >
                {icon}
              </ListItemIcon>
              <Collapse in={!collapsed} timeout={400} orientation="horizontal">
                <ListItemText
                  primary={text}
                  primaryTypographyProps={{
                    fontWeight: location.pathname === path ? 600 : 400,
                    fontSize: "0.95rem",
                  }}
                  sx={{ transition: "all 0.4s ease" }}
                />
              </Collapse>
            </ListItem>
          </Tooltip>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;