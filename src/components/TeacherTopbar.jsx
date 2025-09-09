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
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const TeacherTopbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const [teacherName, setTeacherName] = useState("");
  const [photoURL, setPhotoURL] = useState("");

  const open = Boolean(anchorEl);

  useEffect(() => {
    const fetchTeacher = async () => {
      if (!currentUser?.uid) return;

      try {
        // ✅ Fetch user document directly by UID
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setTeacherName(data.name || data.email || ""); // fallback to email if no name
          setPhotoURL(data.photoURL || "");
        } else {
          console.warn("⚠️ No user profile found in /users");
        }
      } catch (error) {
        console.error("Error fetching teacher profile:", error);
      }
    };

    fetchTeacher();
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

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background:
          "linear-gradient(135deg, rgba(162,155,254,0.85), rgba(116,185,255,0.85), rgba(129,236,236,0.85))",
        backdropFilter: "blur(12px)",
        boxShadow: "0px 2px 10px rgba(0,0,0,0.15)",
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