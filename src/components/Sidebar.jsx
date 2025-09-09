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
  Divider,
  Badge,
} from "@mui/material";
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

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [adminName, setAdminName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

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
        width: 250,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: 250,
          boxSizing: "border-box",
          background:
            "linear-gradient(160deg, rgba(44,62,80,0.9), rgba(52,73,94,0.85), rgba(44,62,80,0.9))",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          color: "#ecf0f1",
          borderRight: "1px solid rgba(255,255,255,0.1)",
          overflowX: "hidden",
        },
      }}
    >
      {/* Profile Section */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 4,
          px: 2,
          textAlign: "center",
          background: "rgba(255, 255, 255, 0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
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
          }}
        >
          {!photoURL && (adminName ? adminName[0].toUpperCase() : "A")}
        </Avatar>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            color: "#ecf0f1",
            fontSize: "1.1rem",
            letterSpacing: "0.5px",
          }}
        >
          {adminName}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "#f1c40f",
            fontWeight: 600,
            fontSize: "0.9rem",
            letterSpacing: "1px",
            textTransform: "uppercase",
            mt: 0.5,
          }}
        >
          Admin Panel
        </Typography>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.15)" }} />

      {/* Navigation */}
      <List
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          mt: 1,
        }}
      >
        {navItems.map(({ text, icon, path }) => (
          <ListItem
            button
            key={text}
            onClick={() => navigate(path)}
            sx={{
              bgcolor:
                location.pathname === path
                  ? "rgba(255, 255, 255, 0.12)"
                  : "transparent",
              color: "#ecf0f1",
              borderRadius: "10px",
              width: "90%",
              mb: 0.8,
              transition: "all 0.3s ease",
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.2)",
                transform: "scale(1.03)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              },
            }}
          >
            <ListItemIcon
              sx={{
                color:
                  location.pathname === path ? "#f1c40f" : "rgba(255,255,255,0.7)",
                minWidth: 40,
                transition: "color 0.3s ease",
              }}
            >
              {icon}
            </ListItemIcon>
            <ListItemText
              primary={text}
              primaryTypographyProps={{
                fontWeight: location.pathname === path ? 600 : 400,
                fontSize: "0.95rem",
              }}
            />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;