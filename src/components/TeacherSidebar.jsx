import React, { useEffect, useState } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Avatar,
  IconButton,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import MenuIcon from "@mui/icons-material/Menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { styled } from "@mui/system";

// 🔑 Rotating hamburger icon
const RotatingIconButton = styled(IconButton)(({ collapsed }) => ({
  transition: "transform 0.4s ease",
  transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
}));

// 🔑 FlipCard for clock
const FlipCard = ({ value }) => {
  const [flipped, setFlipped] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  useEffect(() => {
    if (value !== prevValue) {
      setFlipped(true);
      const timeout = setTimeout(() => {
        setFlipped(false);
        setPrevValue(value);
      }, 600);
      return () => clearTimeout(timeout);
    }
  }, [value, prevValue]);

  return (
    <Box sx={{ width: 50, height: 60, perspective: "1000px", mx: 0.5 }}>
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateX(-90deg)" : "rotateX(0deg)",
          transition: "transform 0.6s ease-in-out",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            width: "100%",
            height: "100%",
            bgcolor: "white",
            color: "black",
            fontSize: "1.4rem",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backfaceVisibility: "hidden",
            borderRadius: "6px",
            boxShadow: "0px 2px 6px rgba(0,0,0,0.25)",
          }}
        >
          {prevValue}
        </Box>
      </Box>
    </Box>
  );
};

const TeacherSidebar = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [teacher, setTeacher] = useState(null);
  const [time, setTime] = useState(new Date());
  const [collapsed, setCollapsed] = useState(
    () => JSON.parse(localStorage.getItem("teacherSidebarCollapsed")) || false
  );

  // ✅ Save collapse state in localStorage & notify Topbar
  useEffect(() => {
    localStorage.setItem("teacherSidebarCollapsed", JSON.stringify(collapsed));
    window.dispatchEvent(new CustomEvent("sidebarToggle", { detail: collapsed }));
  }, [collapsed]);

  // ✅ Fetch teacher info
  useEffect(() => {
    if (!currentUser?.uid) return;
    const userRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setTeacher({ id: docSnap.id, ...docSnap.data() });
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  // ✅ Clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const hours = time.getHours() % 12 || 12;
  const minutes = time.getMinutes();
  const ampm = time.getHours() >= 12 ? "PM" : "AM";
  const paddedHours = hours.toString().padStart(2, "0");
  const paddedMinutes = minutes.toString().padStart(2, "0");

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: collapsed ? 80 : 260,
        transition: "width 0.4s ease",
        background: "linear-gradient(135deg, #a29bfe, #74b9ff, #81ecec)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        zIndex: 1200,
        boxShadow: 3,
      }}
    >
      {/* ✅ Always visible hamburger toggle */}
      <Box
        sx={{
          position: "absolute",
          top: 10,
          right: collapsed ? "calc(50% - 20px)" : 10,
          zIndex: 1300,
        }}
      >
        <RotatingIconButton
          collapsed={collapsed ? 1 : 0}
          onClick={() => setCollapsed(!collapsed)}
          sx={{ color: "#fff" }}
        >
          <MenuIcon />
        </RotatingIconButton>
      </Box>

      {/* Teacher Avatar & Name */}
      {!collapsed && (
        <Box
          sx={{
            mt: 6, // push below hamburger
            textAlign: "center",
            mb: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
          onClick={() => navigate("/teacher/profile")}
        >
          <Avatar
            src={teacher?.photoURL || undefined}
            sx={{
              width: 90,
              height: 90,
              mb: 1,
              boxShadow: "0px 4px 12px rgba(0,0,0,0.25)",
            }}
          >
            {!teacher?.photoURL && teacher?.name
              ? teacher.name[0].toUpperCase()
              : "T"}
          </Avatar>
          <Typography
            variant="h6"
            sx={{
              fontWeight: "bold",
              color: "#fff",
              textShadow: "1px 1px 3px rgba(0,0,0,0.25)",
            }}
          >
            Teacher {teacher?.name || "Name"}
          </Typography>
        </Box>
      )}

      <Divider sx={{ bgcolor: "rgba(255,255,255,0.4)", mb: 2, mt: collapsed ? 6 : 2 }} />

      {/* Clock */}
      {!collapsed && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mb: 3,
          }}
        >
          <FlipCard value={paddedHours} />
          <Typography variant="h5" sx={{ mx: 0.5, fontWeight: "bold" }}>
            :
          </Typography>
          <FlipCard value={paddedMinutes} />
          <Box
            sx={{
              ml: 1,
              px: 1.5,
              py: 1,
              bgcolor: "rgba(255,255,255,0.8)",
              color: "black",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "50px",
            }}
          >
            {ampm}
          </Box>
        </Box>
      )}

      {/* Menu Items */}
      <List sx={{ flexGrow: 1, mt: collapsed ? 8 : 0 }}>
        {[
          { text: "Dashboard", icon: <DashboardIcon />, path: "/teacher/dashboard" },
          { text: "Start Session", icon: <PlayCircleIcon />, path: "/teacher/start-session" },
          { text: "My Profile", icon: <PersonIcon />, path: "/teacher/profile" },
          { text: "Settings", icon: <SettingsIcon />, path: "/teacher/settings" },
        ].map(({ text, icon, path }) => (
          <ListItemButton
            key={text}
            onClick={() => navigate(path)}
            sx={{
              borderRadius: 2,
              mb: 1,
              justifyContent: collapsed ? "center" : "flex-start",
              px: collapsed ? 1 : 2,
              transition: "all 0.3s ease",
              "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
            }}
          >
            <ListItemIcon sx={{ color: "#fff", minWidth: collapsed ? 0 : 40 }}>
              {icon}
            </ListItemIcon>
            {!collapsed && <ListItemText primary={text} />}
          </ListItemButton>
        ))}
      </List>

      {/* Footer */}
      {!collapsed && (
        <>
          <Divider sx={{ bgcolor: "rgba(255,255,255,0.4)", my: 2 }} />
          <Typography
            variant="caption"
            sx={{
              textAlign: "center",
              color: "rgba(255,255,255,0.95)",
              pb: 2,
            }}
          >
            © {new Date().getFullYear()} Teacher Portal
          </Typography>
        </>
      )}
    </Box>
  );
};

export default TeacherSidebar;