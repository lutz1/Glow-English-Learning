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
import { useTheme } from "@mui/material/styles";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import FlipClock from "./FlipClock";

// ✅ Import pumpkin image
import pumpkinIcon from "../assets/pumpkin.png";

const drawerWidth = 240;

const TeacherSidebar = ({ open, onToggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [teacher, setTeacher] = useState(null);

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
    if (isMobile) onToggleSidebar();
  };

  const menuItems = [
    { text: "Dashboard", path: "/teacher/dashboard" },
    { text: "Start Session", path: "/teacher/start-session" },
    { text: "My Profile", path: "/teacher/profile" },
    { text: "Settings", path: "/teacher/settings" },
  ];

  const drawerContent = (
    <>
      {/* Toggle Button */}
      {!isMobile && (
        <IconButton
          onClick={onToggleSidebar}
          size="small"
          sx={{
            position: "absolute",
            top: 15,
            right: open ? 16 : "50%",
            transform: open ? "translate(0,0)" : "translate(50%,0)",
            transition: "all 0.3s ease",
            zIndex: 2,
            "&:hover": { transform: "scale(1.2)" },
          }}
        >
          <Box
            component="img"
            src={pumpkinIcon}
            alt="Toggle"
            sx={{
              width: 30,
              height: 30,
              animation: "glow 2s infinite alternate",
              filter: "drop-shadow(0 0 6px #ff6f00) drop-shadow(0 0 10px #ff3d00)",
            }}
          />
        </IconButton>
      )}

      {/* Header / Avatar Section */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          p: 2,
          mt: 1,
          flexDirection: "column",
        }}
      >
        <Avatar
          src={teacher?.photoURL || pumpkinIcon}
          sx={{
            width: 70,
            height: 70,
            mb: 1,
            boxShadow: "0 0 10px #ff6f00, 0 0 20px #ff3d00",
            border: "2px solid #ff6f00",
            cursor: "pointer",
            animation: "glow 2s infinite alternate",
          }}
          onClick={() => handleNavigate("/teacher/profile")}
        />
        {open && (
          <>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: "bold",
                color: "#ff6f00",
                textShadow: "0 0 8px #ff3d00",
                textAlign: "center",
              }}
            >
              {teacher?.name ? `Teacher ${teacher.name}` : "Teacher"}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <FlipClock />
            </Box>
          </>
        )}
      </Box>

      <Divider sx={{ borderColor: "rgba(255,111,0,0.3)", mt: 2 }} />

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
                  color: "#ff6f00",
                  backgroundColor: isActive
                    ? "rgba(255,111,0,0.2)"
                    : "transparent",
                  "&:hover": {
                    backgroundColor: "rgba(255,111,0,0.1)",
                    transform: "scale(1.05)",
                    boxShadow: "0 0 15px #ff6f00",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                <ListItemIcon sx={{ minWidth: open ? 40 : "auto" }}>
                  <Box
                    component="img"
                    src={pumpkinIcon}
                    alt="Icon"
                    sx={{
                      width: 24,
                      height: 24,
                      filter: "drop-shadow(0 0 4px #ff6f00)",
                      animation: "glow 2s infinite alternate",
                    }}
                  />
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
            color: "rgba(255,111,0,0.8)",
            textShadow: "0 0 6px #ff3d00",
          }}
        >
          © {new Date().getFullYear()} Teacher Portal
        </Typography>
      )}

      {/* Glowing Animation Keyframes */}
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

  return (
    <>
      {isMobile && !open && (
        <IconButton
          onClick={onToggleSidebar}
          color="inherit"
          sx={{
            position: "fixed",
            top: 8,
            left: 8,
            zIndex: 2000,
          }}
        >
          <Box
            component="img"
            src={pumpkinIcon}
            sx={{
              width: 30,
              height: 30,
              animation: "glow 2s infinite alternate",
            }}
          />
        </IconButton>
      )}

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
            background: "rgba(0,0,0,0.35)",
            borderRight: "1px solid rgba(255,111,0,0.3)",
            color: "#fff",
            boxShadow: "0 0 20px #ff6f00 inset",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default TeacherSidebar;