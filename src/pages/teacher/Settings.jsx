import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  IconButton,
  InputAdornment,
} from "@mui/material";
import TeacherSidebar from "../../components/TeacherSidebar";
import TeacherTopbar from "../../components/TeacherTopbar";
import { auth } from "../../firebase";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import LockIcon from "@mui/icons-material/Lock";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";

const drawerWidth = 240;

const Settings = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const handleChange = (e) =>
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));

  const handlePasswordChange = async () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      return setSnackbar({ open: true, message: "Please fill in all fields.", severity: "warning" });
    }
    if (formData.newPassword !== formData.confirmPassword) {
      return setSnackbar({ open: true, message: "Passwords do not match.", severity: "error" });
    }

    setLoading(true);
    try {
      if (!auth.currentUser) throw new Error("No authenticated user found");

      const credential = EmailAuthProvider.credential(auth.currentUser.email, formData.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      await updatePassword(auth.currentUser, formData.newPassword);

      setSnackbar({ open: true, message: "Password updated successfully!", severity: "success" });
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.error("Error updating password:", error);
      setSnackbar({ open: true, message: error.message || "Failed to update password.", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex" }}>
      {/* Sidebar */}
      <TeacherSidebar
        open={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        variant={isMobile ? "temporary" : "persistent"}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${sidebarOpen && !isMobile ? drawerWidth : 60}px)` },
          minHeight: "100vh",
          transition: "width 0.3s",
          background:
            "linear-gradient(135deg, rgba(220,218,253,0.85), rgba(116,185,255,0.85), rgba(129,236,236,0.85))",
          position: "relative",
        }}
      >
        {/* ===== Topbar fixed at top ===== */}
        <TeacherTopbar
          open={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            zIndex: 1200,
          }}
        />

        {/* Content Area */}
        <Box
          sx={{
            p: 3,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            pt: { xs: 8, sm: 10 }, // space for Topbar
          }}
        >
          <Paper
            elevation={6}
            sx={{
              p: { xs: 3, sm: 5 },
              width: "100%",
              maxWidth: 500,
              borderRadius: 4,
              textAlign: "center",
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <LockIcon sx={{ fontSize: 40, color: "#0984e3", mb: 1 }} />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Change Password
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: "#555" }}>
              Update your account password securely.
            </Typography>

            <TextField
              label="Current Password"
              type={showPassword ? "text" : "password"}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              fullWidth
              margin="normal"
              sx={{ bgcolor: "rgba(255,255,255,0.7)", borderRadius: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="New Password"
              type={showPassword ? "text" : "password"}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              fullWidth
              margin="normal"
              sx={{ bgcolor: "rgba(255,255,255,0.7)", borderRadius: 2 }}
            />

            <TextField
              label="Confirm Password"
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              fullWidth
              margin="normal"
              sx={{ bgcolor: "rgba(255,255,255,0.7)", borderRadius: 2 }}
            />

            <Button
              variant="contained"
              sx={{
                mt: 3,
                bgcolor: "#55efc4",
                color: "#2d3436",
                fontWeight: "bold",
                borderRadius: 3,
                "&:hover": { bgcolor: "#00cec9" },
              }}
              onClick={handlePasswordChange}
              disabled={loading}
              fullWidth
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </Paper>
        </Box>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default Settings;