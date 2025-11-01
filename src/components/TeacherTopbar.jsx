import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Box,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Backdrop,
  Tooltip,
  Slide,
  useMediaQuery,
} from "@mui/material";
import {
  Logout as LogoutIcon,
  Email as EmailIcon,
  Settings as SettingsIcon,
  AccountCircle as ProfileIcon,
  KeyboardArrowRight as CloseIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 80;

const TeacherTopbar = ({ open }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const [teacherName, setTeacherName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [slideIn, setSlideIn] = useState(false);

  // 🔹 Fetch live teacher profile
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTeacherName(data.name || data.email || "");
        setPhotoURL(data.photoURL || "");
      }
    });
    return () => unsub();
  }, [currentUser]);

  // 🔹 Drawer open/close logic
  const openDrawer = () => {
    setDrawerOpen(true);
    setTimeout(() => setSlideIn(true), 50);
  };
  const closeDrawer = () => {
    setSlideIn(false);
    setTimeout(() => setDrawerOpen(false), 300);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const sidebarWidth = open ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  return (
    <>
      {/* 🔹 Top AppBar */}
      <AppBar
          position={isMobile && open ? "relative" : "fixed"}
          elevation={0}
          sx={{
            width: { xs: "100%", md: `calc(101.5% - ${sidebarWidth}px)` },
            ml: { xs: 0, md: `${sidebarWidth}px` },
            background:
              "linear-gradient(135deg, rgba(162,155,254,0.85), rgba(116,185,255,0.85), rgba(129,236,236,0.85))",
            backdropFilter: "blur(12px)",
            boxShadow: "0px 2px 10px rgba(0,0,0,0.15)",
            transition: "all 0.3s ease",
            zIndex: isMobile && open ? 998 : 1201, // lower when sidebar open
          }}
        >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          {/* ❌ Removed mobile toggle button */}

          {/* Welcome Text */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: "bold",
              color: "#fff",
              marginLeft:"60px",
              textShadow: "1px 1px 3px rgba(0,0,0,0.2)",
              flexGrow: 1,
            }}
          >
            🎓 Welcome Teacher {teacherName || ""}
          </Typography>

          {/* Avatar Button */}
          <IconButton onClick={openDrawer} sx={{ p: 0 }}>
            <Avatar
              sx={{
                bgcolor: "#6c5ce7",
                width: 42,
                height: 42,
                border: "2px solid rgba(255,255,255,0.3)",
                boxShadow: "0 0 10px rgba(255,255,255,0.3)",
                transition: "transform 0.2s ease",
                "&:hover": { transform: "scale(1.08)" },
              }}
              alt={teacherName || "Teacher"}
              src={photoURL || undefined}
            >
              {!photoURL && (teacherName ? teacherName[0].toUpperCase() : "T")}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* 🔹 Drawer Overlay */}
      <Backdrop
        open={drawerOpen}
        sx={{
          zIndex: 1200,
          backgroundColor: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(5px)",
        }}
        onClick={closeDrawer}
      />

      {/* 🔹 Drawer Menu */}
      {drawerOpen && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            right: 0,
            height: "100vh",
            width: isMobile ? "70%" : isTablet ? "60%" : 340,
            zIndex: 1300,
            display: "flex",
            justifyContent: "flex-end",
            pointerEvents: "none",
          }}
        >
          <Slide direction="left" in={slideIn} mountOnEnter unmountOnExit>
            <Box
              sx={{
                width: "100%",
                height: "100%",
                borderRadius: "20px 0 0 20px",
                background:
            "linear-gradient(135deg, rgba(122, 117, 219, 0.85), rgba(116, 186, 255, 0.8), rgba(129,236,236,0.85))",
                backdropFilter: "blur(20px)",
                boxShadow: "0 8px 25px rgba(0,0,0,0.5)",
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                pointerEvents: "auto",
                overflow: "hidden",
              }}
            >
              {/* Close Button */}
              <Tooltip title="Close Menu" placement="left">
                <IconButton
                  onClick={closeDrawer}
                  sx={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    bgcolor: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.25)",
                      transform: "scale(1.05)",
                    },
                  }}
                  size="small"
                >
                  <CloseIcon sx={{ color: "#fff" }} />
                </IconButton>
              </Tooltip>

              {/* Drawer Content */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  p: 2,
                  "&::-webkit-scrollbar": { width: 6 },
                  "&::-webkit-scrollbar-thumb": {
                    background: "rgba(255,255,255,0.2)",
                    borderRadius: 10,
                  },
                }}
              >
                {/* Profile Section */}
                <Box sx={{ textAlign: "center", mt: 2 }}>
                  <Avatar
                    alt={teacherName}
                    src={photoURL || undefined}
                    sx={{
                      width: 80,
                      height: 80,
                      mx: "auto",
                      mb: 1.5,
                      bgcolor: "#6c5ce7",
                      boxShadow: "0 0 20px rgba(108,92,231,0.5)",
                    }}
                  >
                    {!photoURL && (teacherName ? teacherName[0].toUpperCase() : "T")}
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {teacherName || "Teacher"}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      mt: 0.5,
                    }}
                  >
                    <EmailIcon fontSize="small" sx={{ color: "gray" }} />
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      {currentUser?.email}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.2)" }} />

                {/* Menu Items */}
                <List>
                  {[
                    {
                      icon: <ProfileIcon sx={{ color: "#64B5F6" }} />,
                      label: "My Profile",
                      action: () => navigate("/teacher/profile"),
                    },
                    {
                      icon: <SettingsIcon sx={{ color: "#FFD54F" }} />,
                      label: "Settings",
                      action: () => navigate("/teacher/settings"),
                    },
                    {
                      icon: <LogoutIcon sx={{ color: "#FF5252" }} />,
                      label: "Logout",
                      action: handleLogout,
                    },
                  ].map((item, i) => (
                    <ListItem disablePadding key={i}>
                      <ListItemButton onClick={item.action}>
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          sx={{
                            color: item.label === "Logout" ? "#FF5252" : "inherit",
                            "& .MuiListItemText-primary": {
                              fontWeight: item.label === "Logout" ? 600 : "inherit",
                            },
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>
          </Slide>
        </Box>
      )}
    </>
  );
};

export default TeacherTopbar;