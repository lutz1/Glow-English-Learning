import React, { useEffect, useState, useRef } from "react";
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
  LinearProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import FlipClock from "./FlipClock";

// Icons
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import DashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";
import PlayCircleRoundedIcon from "@mui/icons-material/PlayCircleFilledRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import MusicNoteRoundedIcon from "@mui/icons-material/MusicNoteRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PauseRoundedIcon from "@mui/icons-material/PauseRounded";

const drawerWidth = 240;

// ---------- Simplified Music Player ----------
const MusicPlayer = React.memo(({ open, isPlaying, toggleMusic, progress, audioRef }) => (
  <Box
    sx={{
      px: 2,
      py: 1,
      mt: 1,
      mb: 1,
      display: open ? "flex" : "none",
      flexDirection: "column",
      gap: 1,
      borderRadius: 3,
      background: "linear-gradient(135deg, #1db954 0%, #1ed760 100%)",
      color: "#fff",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      transition: "all 0.3s ease",
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Avatar sx={{ bgcolor: "#fff", width: 36, height: 36 }}>
          <MusicNoteRoundedIcon sx={{ color: "#1db954" }} />
        </Avatar>
        <Typography sx={{ fontWeight: 600 }}>Christmas Music</Typography>
      </Box>
      <IconButton
        onClick={toggleMusic}
        sx={{
          color: "#fff",
          bgcolor: isPlaying ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
          "&:hover": { bgcolor: isPlaying ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" },
          transition: "all 0.3s ease",
        }}
      >
        {isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
      </IconButton>
    </Box>

    <LinearProgress
      variant="determinate"
      value={progress}
      sx={{
        height: 6,
        borderRadius: 3,
        "& .MuiLinearProgress-bar": { bgcolor: "#fff" },
        backgroundColor: "rgba(255,255,255,0.3)",
      }}
    />
  </Box>
));

// ---------- Main Sidebar ----------
const TeacherSidebar = ({ open, onToggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [teacher, setTeacher] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  // Fetch teacher
  useEffect(() => {
    if (!currentUser?.uid) return;
    const userRef = doc(db, "users", currentUser.uid);
    const unsubscribe = onSnapshot(userRef, docSnap => {
      if (docSnap.exists()) setTeacher({ id: docSnap.id, ...docSnap.data() });
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Audio
  useEffect(() => {
    audioRef.current = new Audio(`${process.env.PUBLIC_URL}/christmas.mp3`);
    audioRef.current.loop = true;

    const interval = setInterval(() => {
      if (!audioRef.current) return;
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0);
    }, 500);

    return () => {
      audioRef.current.pause();
      clearInterval(interval);
    };
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (!isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
    setIsPlaying(prev => !prev);
  };

  const handleNavigate = path => {
    navigate(path);
    if (isMobile) onToggleSidebar();
  };

  const menuItems = [
    { text: "Dashboard", path: "/teacher/dashboard", icon: <DashboardRoundedIcon /> },
    { text: "Start Session", path: "/teacher/start-session", icon: <PlayCircleRoundedIcon /> },
    { text: "My Profile", path: "/teacher/profile", icon: <PersonRoundedIcon /> },
    { text: "Settings", path: "/teacher/settings", icon: <SettingsRoundedIcon /> },
  ];

  const drawerContent = (
    <>
      {/* Toggle Button */}
      {!isMobile && (
        <IconButton
          onClick={onToggleSidebar}
          sx={{
            position: "absolute",
            top: 14,
            right: open ? 16 : "50%",
            transform: open ? "translateX(0)" : "translateX(50%)",
            zIndex: 2000,
            color: "#a83232",
            bgcolor: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.5)",
            "&:hover": { bgcolor: "#fff" },
            transition: "all 0.3s ease",
          }}
        >
          <MenuRoundedIcon />
        </IconButton>
      )}

      {/* Header */}
      <Box
        sx={{
          position: "relative",
          p: 2,
          mt: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 2,
          transition: "all 0.3s ease",
        }}
      >
        <Avatar
          src={teacher?.photoURL}
          onClick={() => handleNavigate("/teacher/profile")}
          sx={{
            width: open ? 70 : 60,
            height: open ? 70 : 60,
            mt: open ? 2 : 2,
            mb: 1,
            borderRadius: "22px",
            cursor: "pointer",
            boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
            transition: "all 0.3s ease",
          }}
        />
        <Box
          sx={{
            opacity: open ? 1 : 0,
            height: open ? "auto" : 0,
            overflow: "hidden",
            transition: "all 0.3s ease",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography sx={{ fontWeight: 600 }}>
            {teacher?.name ? `Teacher ${teacher.name}` : "Teacher"}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <FlipClock />
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mx: 1, opacity: 0.5 , mt: 2}} />
      <MusicPlayer open={open} isPlaying={isPlaying} toggleMusic={toggleMusic} progress={progress} audioRef={audioRef}  />
      <Divider sx={{ mx: 1, opacity: 0.5 , mt: 1}} />
      {/* Menu */}
      <List sx={{ zIndex: 2, mt: 2 }}>
        {menuItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Tooltip key={item.text} title={open ? "" : item.text} placement="right" arrow>
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                sx={{
                  borderRadius: "12px",
                  mx: 1,
                  my: 0.5,
                  px: open ? 2 : 1,
                  backgroundColor: isActive ? "rgba(255,255,255,0.9)" : "transparent",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.6)" },
                  transition: "all 0.25s ease",
                }}
              >
                <ListItemIcon sx={{ minWidth: open ? 42 : "auto" }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} sx={{ opacity: open ? 1 : 0, transition: "opacity 0.3s ease" }} />
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      {/* Footer */}
      <Typography
        sx={{
          position: "absolute",
          bottom: 14,
          width: "100%",
          textAlign: "center",
          color: "rgba(0,0,0,0.5)",
          zIndex: 2,
          opacity: open ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      >
        © {new Date().getFullYear()} Teacher Portal
      </Typography>
    </>
  );

  return (
    <>
      {isMobile && !open && (
        <IconButton
          onClick={onToggleSidebar}
          sx={{
            position: "fixed",
            top: 10,
            left: 10,
            zIndex: 2000,
            background: "#ffffffaa",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(0,0,0,0.1)",
          }}
        >
          <MenuRoundedIcon />
        </IconButton>
      )}

      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={open}
        onClose={onToggleSidebar}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: open ? drawerWidth : 70,
          "& .MuiDrawer-paper": {
            width: open ? drawerWidth : 70,
            backdropFilter: "blur(25px)",
            background: "rgba(255, 255, 255, 0.42)",
            borderRight: "1px solid rgba(0,0,0,0.1)",
            overflow: "hidden",
            transition: "width 0.3s ease",
            position: "relative",
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default TeacherSidebar;