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
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

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
    <Box sx={{ width: 60, height: 60, perspective: "1000px", mx: 0.5 }}>
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
            fontSize: "2rem",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backfaceVisibility: "hidden",
            borderRadius: "6px",
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

  // Live updates with onSnapshot
  useEffect(() => {
    if (!currentUser?.uid) return;

    const userRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setTeacher({ id: docSnap.id, ...docSnap.data() });
        }
      },
      (error) => console.error("Error fetching teacher data:", error)
    );

    return () => unsubscribe();
  }, [currentUser]);

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
        width: 260,
        background: "linear-gradient(135deg, #a29bfe, #74b9ff, #81ecec)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        p: 2,
        boxShadow: 3,
      }}
    >
      {/* Teacher Avatar & Name */}
      <Box
        sx={{
          textAlign: "center",
          mb: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          cursor: "pointer",
        }}
        onClick={() => navigate("/teacher/profile")}
      >
        <Avatar
          src={teacher?.photoURL || undefined}
          sx={{ width: 100, height: 100, mb: 1 }}
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
          Teacher {teacher?.name || "Teacher Name"}
        </Typography>
      </Box>

      <Divider sx={{ bgcolor: "rgba(5, 5, 5, 0.4)", mb: 2 }} />

      {/* Flip Clock */}
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
            color: "black",
            fontWeight: "bold",
            fontSize: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "50px",
          }}
        >
          {ampm}
        </Box>
      </Box>

      <Divider sx={{ bgcolor: "rgba(5, 5, 5, 0.4)", mb: 2 }} />

      {/* Menu Items */}
      <List>
        <ListItemButton
          onClick={() => navigate("/teacher/dashboard")}
          sx={{
            borderRadius: 2,
            mb: 1,
            "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
          }}
        >
          <ListItemIcon sx={{ color: "#fff" }}>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>

        <ListItemButton
          onClick={() => navigate("/teacher/start-session")}
          sx={{
            borderRadius: 2,
            mb: 1,
            "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
          }}
        >
          <ListItemIcon sx={{ color: "#fff" }}>
            <PlayCircleIcon />
          </ListItemIcon>
          <ListItemText primary="Start Session" />
        </ListItemButton>

        <ListItemButton
          onClick={() => navigate("/teacher/profile")}
          sx={{
            borderRadius: 2,
            mb: 1,
            "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
          }}
        >
          <ListItemIcon sx={{ color: "#fff" }}>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText primary="My Profile" />
        </ListItemButton>

        <ListItemButton
          onClick={() => navigate("/teacher/settings")}
          sx={{
            borderRadius: 2,
            mb: 1,
            "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
          }}
        >
          <ListItemIcon sx={{ color: "#fff" }}>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </ListItemButton>
      </List>

      <Box sx={{ flexGrow: 1 }} />

      {/* Footer */}
      <Divider sx={{ bgcolor: "rgba(255,255,255,0.4)", my: 2 }} />
      <Typography
        variant="caption"
        sx={{
          textAlign: "center",
          color: "rgba(255,255,255,0.95)",
        }}
      >
        © {new Date().getFullYear()} Teacher Portal
      </Typography>
    </Box>
  );
};

export default TeacherSidebar;