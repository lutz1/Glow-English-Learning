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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
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
  getDocs,
  setDoc,
} from "firebase/firestore";
import gcashQR from "../assets/gcash.jpg"; // ✅ Static local QR image

const Topbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [walletOpen, setWalletOpen] = useState(false);
  const [totalTax, setTotalTax] = useState(0);
  const [loadingQR, setLoadingQR] = useState(true);

  const open = Boolean(anchorEl);
  const notifOpen = Boolean(notifAnchorEl);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribeUser = () => {};

    // ✅ Listen to auth state
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
        const userDocRef = doc(db, "users", user.uid);
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

    // ✅ Notifications listener
    const notifQuery = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribeNotif = onSnapshot(notifQuery, async (snapshot) => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const validNotifs = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const createdAt = data.createdAt ? data.createdAt.toDate() : null;

        if (
          (createdAt && createdAt < fiveDaysAgo) ||
          (data.type === "login" && createdAt && createdAt < oneHourAgo)
        ) {
          try {
            await deleteDoc(doc(db, "notifications", docSnap.id));
          } catch {}
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

  // 🔹 Fetch total ₱0.50 per session
  const fetchWalletData = async () => {
    try {
      setLoadingQR(true);
      const sessionSnap = await getDocs(collection(db, "sessions"));
      const total = sessionSnap.size * 0.5;
      setTotalTax(total);
    } catch (err) {
      console.error("Error fetching wallet data:", err);
    } finally {
      setLoadingQR(false);
    }
  };

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleNotifOpen = async (e) => {
    setNotifAnchorEl(e.currentTarget);
    try {
      for (const notif of notifications) {
        if (notif.status === "pending") {
          await updateDoc(doc(db, "notifications", notif.id), { status: "read" });
        }
      }
      setUnreadCount(0);
    } catch {}
  };

  const handleNotifClose = () => setNotifAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    signOut(auth).then(() => navigate("/login"));
  };

  // 🔹 Open wallet dialog
  const handleOpenWallet = async () => {
    handleMenuClose();
    await fetchWalletData();
    setWalletOpen(true);
  };

  // 🔹 Reset total after payment
  const handleDonePayment = async () => {
    setTotalTax(0);
    await setDoc(doc(db, "settings", "lastPayment"), {
      timestamp: new Date(),
      amountPaid: totalTax,
    });
    alert("Payment confirmed. Total reset to ₱0.00.");
    setWalletOpen(false);
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background:
            "linear-gradient(160deg, rgba(44,62,80,0.9), rgba(52,73,94,0.85))",
          backdropFilter: "blur(12px)",
          color: "#ecf0f1",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
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
                >
                  <Avatar
                    src={notif.photo || undefined}
                    sx={{ width: 36, height: 36, bgcolor: "#3498db" }}
                  >
                    {!notif.photo &&
                      (notif.teacher ? notif.teacher[0].toUpperCase() : "T")}
                  </Avatar>
                  <ListItemText
                    primary={notif.message}
                    secondary={notif.createdAt.toLocaleString()}
                  />
                </MenuItem>
              ))}
            </Menu>

            {/* User name & avatar */}
            <Typography>{userName}</Typography>
            <IconButton onClick={handleMenuOpen} sx={{ p: 0 }}>
              <Avatar src={photoURL || undefined}>
                {!photoURL && (userName ? userName[0].toUpperCase() : "A")}
              </Avatar>
            </IconButton>

            {/* User Menu */}
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              PaperProps={{
                sx: {
                  bgcolor: "rgba(52,73,94,0.95)",
                  color: "#ecf0f1",
                  borderRadius: 2,
                },
              }}
            >
              <MenuItem onClick={() => navigate("/admin/profile")}>
                👤 My Profile
              </MenuItem>
              <MenuItem onClick={() => navigate("/admin/settings")}>
                ⚙️ Settings
              </MenuItem>
              <MenuItem onClick={handleOpenWallet}>💰 E-Wallet for Tax</MenuItem>
              <Divider sx={{ borderColor: "rgba(255,255,255,0.2)" }} />
              <MenuItem onClick={handleLogout}>🚪 Logout</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 💰 E-Wallet Dialog */}
      <Dialog
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: "center", fontWeight: "bold" }}>
          💰 E-Wallet for Tax
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center" }}>
          {loadingQR ? (
            <CircularProgress sx={{ my: 3 }} />
          ) : (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Total: ₱{totalTax.toFixed(2)}
              </Typography>

              {userEmail !== "robert.llemit@gmail.com" && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => window.open(gcashQR, "_blank")}
                  sx={{ mt: 2 }}
                >
                  Click to Pay
                </Button>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Button onClick={() => setWalletOpen(false)}>Close</Button>
          {userEmail !== "robert.llemit@gmail.com" && (
            <Button variant="contained" color="success" onClick={handleDonePayment}>
              Done Payment
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Topbar;