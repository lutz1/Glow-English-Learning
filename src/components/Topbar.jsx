import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Divider,
  ListItemText,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";

const Topbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [userName, setUserName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const open = Boolean(anchorEl);
  const notifOpen = Boolean(notifAnchorEl);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribeUser = () => {};

    // ✅ Listen to auth state
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);

        // ✅ Real-time listener for user profile
        unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserName(
              data.name || user.displayName || user.email.split("@")[0]
            );
            setPhotoURL(data.photoURL || user.photoURL || "");
          } else {
            setUserName(user.displayName || user.email.split("@")[0]);
            setPhotoURL(user.photoURL || "");
          }
        });
      }
    });

    // ✅ Listen to notifications
    const notifQuery = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribeNotif = onSnapshot(notifQuery, async (snapshot) => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000); // ⏱ Auto-remove after 1h
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const validNotifs = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const createdAt = data.createdAt ? data.createdAt.toDate() : null;

        // Auto-remove very old (5 days) or expired (1 hour for login)
        if (
          (createdAt && createdAt < fiveDaysAgo) ||
          (data.type === "login" && createdAt && createdAt < oneHourAgo)
        ) {
          try {
            await deleteDoc(doc(db, "notifications", docSnap.id));
          } catch (err) {
            console.error("Error deleting old notification:", err);
          }
          continue;
        }

        if (data.status === "completed") continue;

        validNotifs.push({
          id: docSnap.id,
          message:
            data.type === "login"
              ? `${data.teacherName || "A teacher"} is online`
              : data.teacherEmail
              ? `Password reset requested`
              : data.message || "New notification",
          teacher: data.teacherName || data.teacherEmail || "",
          photo: data.teacherPhoto || "",
          type: data.type || "general",
          status: data.status || "pending",
          createdAt: createdAt || new Date(),
        });
      }

      setNotifications(validNotifs);
      setUnreadCount(validNotifs.filter((n) => n.status !== "read").length);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUser();
      unsubscribeNotif();
    };
  }, []);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleNotifOpen = async (event) => {
    setNotifAnchorEl(event.currentTarget);

    try {
      for (const notif of notifications) {
        if (notif.status === "pending") {
          await updateDoc(doc(db, "notifications", notif.id), {
            status: "read",
          });
        }
      }
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking notifications as read:", err);
    }
  };

  const handleNotifClose = () => setNotifAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    signOut(auth).then(() => navigate("/login"));
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background:
          "linear-gradient(160deg, rgba(44,62,80,0.9), rgba(52,73,94,0.85), rgba(44,62,80,0.9))",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        color: "#ecf0f1",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: "bold",
            color: "#ecf0f1",
            textShadow: "1px 1px 3px rgba(0,0,0,0.3)",
          }}
        >
          🏢 Glow English Admin Panel
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* Notifications */}
          <IconButton color="inherit" onClick={handleNotifOpen}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon sx={{ color: "#f1c40f" }} />
            </Badge>
          </IconButton>

          {/* Notifications dropdown */}
          <Menu
            anchorEl={notifAnchorEl}
            open={notifOpen}
            onClose={handleNotifClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{
              sx: {
                bgcolor: "rgba(44,62,80,0.95)",
                backdropFilter: "blur(10px)",
                color: "#ecf0f1",
                minWidth: 280,
                borderRadius: 2,
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              },
            }}
          >
            {notifications.length === 0 && (
              <MenuItem>No new notifications</MenuItem>
            )}
            {notifications.map((notif) => (
              <MenuItem
                key={notif.id}
                onClick={() => {
                  handleNotifClose();
                  navigate("/admin/notifications", {
                    state: { notifId: notif.id },
                  });
                }}
                sx={{
                  whiteSpace: "normal",
                  alignItems: "center",
                  gap: 1,
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.08)",
                  },
                }}
              >
                <Avatar
                  src={notif.photo || undefined}
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: "#3498db",
                    fontSize: "0.9rem",
                  }}
                >
                  {!notif.photo &&
                    (notif.teacher ? notif.teacher[0].toUpperCase() : "T")}
                </Avatar>
                <ListItemText
                  primary={notif.message}
                  secondary={`${notif.createdAt.toLocaleDateString()} ${notif.createdAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`}
                  primaryTypographyProps={{
                    sx: { fontWeight: "bold", fontSize: "0.9rem" },
                  }}
                  secondaryTypographyProps={{
                    sx: {
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "0.75rem",
                    },
                  }}
                />
              </MenuItem>
            ))}
          </Menu>

          {/* User name */}
          <Typography
            variant="body1"
            sx={{ fontWeight: 500, color: "#ecf0f1" }}
          >
            {userName}
          </Typography>

          {/* User avatar */}
          <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
            <Avatar
              sx={{ bgcolor: "#3498db", width: 40, height: 40 }}
              src={photoURL || undefined}
            >
              {!photoURL && (userName ? userName[0].toUpperCase() : "A")}
            </Avatar>
          </IconButton>

          {/* User menu */}
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{
              sx: {
                bgcolor: "rgba(52,73,94,0.95)",
                backdropFilter: "blur(10px)",
                color: "#ecf0f1",
                minWidth: 180,
                borderRadius: 2,
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              },
            }}
          >
            <MenuItem
              onClick={() => {
                navigate("/admin/profile");
                handleMenuClose();
              }}
            >
              👤 My Profile
            </MenuItem>
            <MenuItem
              onClick={() => {
                navigate("/admin/settings");
                handleMenuClose();
              }}
            >
              ⚙️ Settings
            </MenuItem>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.2)" }} />
            <MenuItem onClick={handleLogout}>🚪 Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;