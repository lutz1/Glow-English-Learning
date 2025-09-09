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

const Settings = () => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

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

      // Reauthenticate
      const credential = EmailAuthProvider.credential(auth.currentUser.email, formData.currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password in Firebase Auth
      await updatePassword(auth.currentUser, formData.newPassword);

      // ✅ Removed Firestore update (teachers cannot write passwordUpdatedAt)
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
    <Box display="flex" sx={{ minHeight: "100vh", background: "linear-gradient(135deg, #a29bfe, #74b9ff, #81ecec)" }}>
      <TeacherSidebar />
      <Box flexGrow={1} display="flex" flexDirection="column">
        <TeacherTopbar />
        <Box sx={{ flexGrow: 1, position: "relative", p: 3, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
          <Box sx={{ position: "relative", maxWidth: 500, width: "100%", mt: 5, zIndex: 1 }}>
            <Paper elevation={6} sx={{ p: 5, borderRadius: 4, textAlign: "center", background: "rgba(255,255,255,0.8)", backdropFilter: "blur(10px)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
              <LockIcon sx={{ fontSize: 40, color: "#0984e3", mb: 1 }} />
              <Typography variant="h5" fontWeight="bold" gutterBottom>Change Password</Typography>
              <Typography variant="body2" sx={{ mb: 3, color: "#555" }}>Update your account password securely.</Typography>

              <TextField
                label="Current Password"
                type={showPassword ? "text" : "password"}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                fullWidth margin="normal"
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
                fullWidth margin="normal"
                sx={{ bgcolor: "rgba(255,255,255,0.7)", borderRadius: 2 }}
              />

              <TextField
                label="Confirm Password"
                type={showPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                fullWidth margin="normal"
                sx={{ bgcolor: "rgba(255,255,255,0.7)", borderRadius: 2 }}
              />

              <Button
                variant="contained"
                sx={{ mt: 3, bgcolor: "#55efc4", color: "#2d3436", fontWeight: "bold", borderRadius: 3, "&:hover": { bgcolor: "#00cec9" } }}
                onClick={handlePasswordChange}
                disabled={loading} fullWidth
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </Paper>
          </Box>
        </Box>

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: "100%" }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default Settings;