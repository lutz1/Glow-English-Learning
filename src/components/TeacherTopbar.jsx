import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

const EXPANDED_WIDTH = 260; // sidebar expanded width
const COLLAPSED_WIDTH = 80; // sidebar collapsed width

const TeacherTopbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const [teacherName, setTeacherName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [collapsed, setCollapsed] = useState(
    () => JSON.parse(localStorage.getItem("teacherSidebarCollapsed")) || false
  );

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const open = Boolean(anchorEl);

  // 🔄 Sync topbar with sidebar collapse state in real time
  useEffect(() => {
    const handleSidebarToggle = (e) => {
      if (e.detail !== undefined) {
        setCollapsed(e.detail);
      } else {
        setCollapsed(
          JSON.parse(localStorage.getItem("teacherSidebarCollapsed")) || false
        );
      }
    };

    window.addEventListener("sidebarToggle", handleSidebarToggle);
    return () => window.removeEventListener("sidebarToggle", handleSidebarToggle);
  }, []);

  // 🔄 Live teacher profile
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = onSnapshot(
      doc(db, "users", currentUser.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTeacherName(data.name || data.email || "");
          setPhotoURL(data.photoURL || "");
        }
      },
      (error) => {
        console.error("Error fetching teacher profile:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
    handleMenuClose();
  };

  // 👇 Sidebar width based on collapsed state
  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: isMobile ? "100%" : `calc(100% - ${sidebarWidth}px)`,
        ml: isMobile ? 0 : `${sidebarWidth}px`,
        background:
          "linear-gradient(135deg, rgba(162,155,254,0.85), rgba(116,185,255,0.85), rgba(129,236,236,0.85))",
        backdropFilter: "blur(12px)",
        boxShadow: "0px 2px 10px rgba(0,0,0,0.15)",
        transition: "all 0.3s ease", // smooth transition
      }}
    >
      <Toolbar>
        {/* Left side - Welcome Message */}
        <Typography
          variant="h6"
          sx={{
            flexGrow: 1,
            fontWeight: "bold",
            color: "#fff",
            textShadow: "1px 1px 3px rgba(0,0,0,0.2)",
          }}
        >
          🎓 Welcome Teacher {teacherName || ""}
        </Typography>

        {/* Right side - Avatar */}
        <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
          <Avatar
            sx={{ bgcolor: "#6c5ce7", width: 40, height: 40 }}
            alt={teacherName || "Teacher"}
            src={photoURL || undefined}
          >
            {!photoURL && (teacherName ? teacherName[0].toUpperCase() : "T")}
          </Avatar>
        </IconButton>

        {/* Dropdown Menu */}
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <MenuItem
            onClick={() => {
              navigate("/teacher/profile");
              handleMenuClose();
            }}
          >
            👤 My Profile
          </MenuItem>
          <MenuItem
            onClick={() => {
              navigate("/teacher/settings");
              handleMenuClose();
            }}
          >
            ⚙️ Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>🚪 Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default TeacherTopbar;