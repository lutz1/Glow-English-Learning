import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Box,
  Backdrop,
  Slide,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import pumpkinIcon from "../assets/pumpkin.png";
import {
  Logout as LogoutIcon,
  Email as EmailIcon,
  Settings as SettingsIcon,
  AccountCircle as ProfileIcon,
  KeyboardArrowRight as CloseIcon,
} from "@mui/icons-material";

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

  const EXPANDED_WIDTH = 260;
  const COLLAPSED_WIDTH = 80;
  const sidebarWidth = open ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  return (
    <>
      {/* Top AppBar */}
      <AppBar
        position={isMobile && open ? "relative" : "fixed"}
        elevation={0}
        sx={{
          width: { xs: "100%", md: `calc(101.5% - ${sidebarWidth}px)` },
          ml: { xs: 0, md: `${sidebarWidth}px` },
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(15px)",
          boxShadow: "0px 0 20px #ff6f00 inset",
          transition: "all 0.3s ease",
          zIndex: isMobile && open ? 998 : 1201,
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: "bold",
              color: "#ff6f00",
              textShadow: "0 0 8px #ff3d00",
              flexGrow: 1,
              marginLeft: "60px",
            }}
          >
            🎃 Welcome Teacher {teacherName || ""}
          </Typography>

          {/* Avatar / Drawer toggle */}
          <IconButton onClick={openDrawer} sx={{ p: 0 }}>
            <Avatar
              src={photoURL || pumpkinIcon}
              alt={teacherName || "Teacher"}
              sx={{
                width: 42,
                height: 42,
                border: "2px solid #ff6f00",
                boxShadow: "0 0 10px #ff6f00, 0 0 20px #ff3d00",
                animation: "glow 2s infinite alternate",
                "&:hover": { transform: "scale(1.08)" },
              }}
            >
              {!photoURL && (teacherName ? teacherName[0].toUpperCase() : "T")}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer Backdrop */}
      <Backdrop
        open={drawerOpen}
        sx={{ zIndex: 1200, backgroundColor: "rgba(0,0,0,0.35)", backdropFilter: "blur(5px)" }}
        onClick={closeDrawer}
      />

      {/* Drawer Menu */}
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
                background: "rgba(0,0,0,0.35)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 0 20px #ff6f00 inset",
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
                    "&:hover": { bgcolor: "rgba(255,255,255,0.25)", transform: "scale(1.05)" },
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
                  "&::-webkit-scrollbar-thumb": { background: "rgba(255,255,255,0.2)", borderRadius: 10 },
                }}
              >
                {/* Profile Section */}
                <Box sx={{ textAlign: "center", mt: 2 }}>
                  <Avatar
                    src={photoURL || pumpkinIcon}
                    alt={teacherName}
                    sx={{
                      width: 80,
                      height: 80,
                      mx: "auto",
                      mb: 1.5,
                      boxShadow: "0 0 20px #ff6f00, 0 0 30px #ff3d00",
                      animation: "glow 2s infinite alternate",
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {teacherName || "Teacher"}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mt: 0.5 }}>
                    <EmailIcon fontSize="small" sx={{ color: "gray" }} />
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                      {currentUser?.email}
                    </Typography>
                  </Box>
                </Box>

                {/* Menu Items with pumpkin glow */}
                <List>
                  {[
                    { icon: pumpkinIcon, label: "My Profile", action: () => navigate("/teacher/profile") },
                    { icon: pumpkinIcon, label: "Settings", action: () => navigate("/teacher/settings") },
                    { icon: pumpkinIcon, label: "Logout", action: handleLogout },
                  ].map((item, i) => (
                    <ListItem disablePadding key={i}>
                      <ListItemButton onClick={item.action} sx={{ "&:hover": { boxShadow: "0 0 15px #ff6f00" } }}>
                        <ListItemIcon>
                          <Box
                            component="img"
                            src={item.icon}
                            alt="icon"
                            sx={{ width: 24, height: 24, filter: "drop-shadow(0 0 4px #ff6f00) drop-shadow(0 0 10px #ff3d00)", animation: "glow 2s infinite alternate" }}
                          />
                        </ListItemIcon>
                        <ListItemText primary={item.label} sx={{ color: "#fff" }} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>
          </Slide>
        </Box>
      )}

      {/* Glowing Keyframes */}
      <style>
        {`
          @keyframes glow {
            0% { filter: drop-shadow(0 0 4px #ff6f00) drop-shadow(0 0 10px #ff3d00); }
            50% { filter: drop-shadow(0 0 8px #ff6f00) drop-shadow(0 0 20px #ff3d00); }
            100% { filter: drop-shadow(0 0 4px #ff6f00) drop-shadow(0 0 10px #ff3d00); }
          }
        `}
      </style>
    </>
  );
};

export default TeacherTopbar;