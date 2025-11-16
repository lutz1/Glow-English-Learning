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
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  useMediaQuery,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
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

  const EXPANDED_WIDTH = 240;
  const COLLAPSED_WIDTH = 70;
  const sidebarWidth = open ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  // Ambient glow
  const AmbientGlow = (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        background: open
          ? "radial-gradient(circle at top, rgba(255,0,0,0.28), transparent 70%), radial-gradient(circle at bottom, rgba(0,180,0,0.25), transparent 70%)"
          : "transparent",
        mixBlendMode: "soft-light",
        transition: "all 0.6s ease",
        zIndex: 0,
      }}
    />
  );

  return (
    <>
      {/* Top AppBar */}
      <AppBar
        position={isMobile && open ? "relative" : "fixed"}
        elevation={0}
        sx={{
          width: { xs: "100%", md: `calc(100% - ${sidebarWidth}px)` },
          ml: { xs: 0, md: `${sidebarWidth}px` },
          background: "rgba(255, 255, 255, 0.57)",
          backdropFilter: "blur(15px)",
          boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
          transition: "all 0.3s ease",
          zIndex: isMobile && open ? 998 : 1201,
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Box sx={{ flexGrow: 1, ml: "5px" }}>
  <Typography
    variant="h6"
    sx={{
      fontWeight: 600,
      color: "#b71c1c", // warm red
      lineHeight: 1.3,
      textShadow: "0 0 6px rgba(255,215,0,0.7), 0 0 4px rgba(76,175,80,0.5)", // gold + green glow
    }}
  >
    🎄 Merry Christmas, Teacher {teacherName || "Teacher"}!
  </Typography>
  <Typography
    variant="subtitle2"
    sx={{
      color: "#4e342e", // soft brown for warmth
      textShadow: "0 0 3px rgba(255,235,59,0.5)", // subtle golden glow
      mt: 0.5,
    }}
  >
    Wishing you a warm and joyful season ✨
  </Typography>
</Box>
          {/* Avatar / Drawer toggle */}
          <IconButton onClick={openDrawer} sx={{ p: 0 }}>
            <Avatar
              src={photoURL}
              alt={teacherName || "Teacher"}
              sx={{
                width: 42,
                height: 42,
                border: "1px solid rgba(0,0,0,0.1)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                transition: "transform 0.2s",
                "&:hover": { transform: "scale(1.05)" },
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
        sx={{ zIndex: 1200, backgroundColor: "rgba(0,0,0,0.2)", backdropFilter: "blur(5px)" }}
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
                background: "rgba(255,255,255,0.42)",
                backdropFilter: "blur(25px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                color: "#111",
                display: "flex",
                flexDirection: "column",
                pointerEvents: "auto",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {AmbientGlow}

              {/* Close Button */}
              <Tooltip title="Close Menu" placement="left">
                <IconButton
                  onClick={closeDrawer}
                  sx={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    bgcolor: "rgba(255,255,255,0.5)",
                    border: "1px solid rgba(0,0,0,0.1)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.7)", transform: "scale(1.05)" },
                  }}
                  size="small"
                >
                  <CloseIcon sx={{ color: "#111" }} />
                </IconButton>
              </Tooltip>

              {/* Drawer Content */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  p: 3,
                  mt: 5,
                  "&::-webkit-scrollbar": { width: 6 },
                  "&::-webkit-scrollbar-thumb": { background: "rgba(0,0,0,0.1)", borderRadius: 10 },
                }}
              >
                {/* Profile Section */}
                <Box sx={{ textAlign: "center", mt: 2 }}>
                  <Avatar
                    src={photoURL}
                    alt={teacherName}
                    sx={{
                      width: 80,
                      height: 80,
                      mx: "auto",
                      mb: 1.5,
                      boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
                      borderRadius: "22px",
                    }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {teacherName || "Teacher"}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mt: 0.5 }}>
                    <EmailIcon fontSize="small" sx={{ color: "gray" }} />
                    <Typography variant="body2" sx={{ color: "rgba(0,0,0,0.6)" }}>
                      {currentUser?.email}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2, opacity: 0.4 }} />

                {/* Menu Items */}
                <List sx={{ mt: 1 }}>
                  {[
                    { icon: <ProfileIcon />, label: "My Profile", action: () => navigate("/teacher/profile") },
                    { icon: <SettingsIcon />, label: "Settings", action: () => navigate("/teacher/settings") },
                    { icon: <LogoutIcon />, label: "Logout", action: handleLogout },
                  ].map((item, i) => (
                    <ListItemButton
                      key={i}
                      onClick={item.action}
                      sx={{
                        borderRadius: 2,
                        mb: 1,
                        "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        px: 2,
                      }}
                    >
                      <ListItemIcon sx={{ color: "#111", minWidth: 36 }}>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.label} sx={{ color: "#111" }} />
                    </ListItemButton>
                  ))}
                </List>

                {/* Footer */}
                <Typography
                  variant="caption"
                  sx={{
                    position: "absolute",
                    bottom: 14,
                    width: "100%",
                    textAlign: "center",
                    color: "rgba(0,0,0,0.5)",
                  }}
                >
                  © {new Date().getFullYear()} Teacher Portal
                </Typography>
              </Box>
            </Box>
          </Slide>
        </Box>
      )}
    </>
  );
};

export default TeacherTopbar;