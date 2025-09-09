import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Divider,
  TextField,
  Button,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import { useAuth } from "../../hooks/useAuth";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import TeacherLayout from "../../layout/TeacherLayout";

const Profile = () => {
  const { currentUser } = useAuth();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    gender: "",
    photoURL: "",
  });

  // Fetch teacher data
  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!currentUser?.uid) return;

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          setTeacher({ id: userSnap.id, ...data });

          setFormData({
            name: data.name || "",
            phone: data.phone || "",
            gender: data.gender || "",
            photoURL: data.photoURL || "",
          });
        }
      } catch (error) {
        console.error("Error fetching teacher data:", error);
        setSnackbar({
          open: true,
          message: "Failed to fetch profile data.",
          severity: "error",
        });
      }
    };

    fetchTeacherData();
  }, [currentUser]);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // Save profile updates
  const handleSave = async () => {
    if (!teacher?.id) {
      setSnackbar({
        open: true,
        message: "Teacher ID not loaded yet.",
        severity: "error",
      });
      return;
    }

    setLoading(true);

    try {
      const teacherRef = doc(db, "users", teacher.id);

      // Build update object
      const updateData = {
        name: formData.name || "",
        phone: formData.phone || "",
        gender: formData.gender || "",
        updatedAt: serverTimestamp(),
      };

      // Include photoURL only if it's non-empty
      if (formData.photoURL) updateData.photoURL = formData.photoURL;

      await updateDoc(teacherRef, updateData);

      setTeacher((prev) => ({ ...prev, ...updateData }));
      setSnackbar({
        open: true,
        message: "Profile updated successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      setSnackbar({
        open: true,
        message: "Failed to update profile. " + (error.message || ""),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <TeacherLayout>
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          p: 3,
          minHeight: "100vh",
        }}
      >
        <Paper
          sx={{
            p: 4,
            width: "100%",
            maxWidth: 700,
            borderRadius: 4,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            bgcolor: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(6px)",
          }}
        >
          {/* Avatar */}
          <Box display="flex" alignItems="center" mb={3}>
            <Avatar
              src={formData.photoURL || undefined}
              sx={{
                width: 80,
                height: 80,
                mr: 3,
                bgcolor: "#74b9ff",
                fontSize: 28,
                boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
              }}
            >
              {!formData.photoURL && (formData.name ? formData.name[0].toUpperCase() : "T")}
            </Avatar>
            <Typography variant="h5" sx={{ color: "#2d3436", fontWeight: "bold" }}>
              {formData.name || "Teacher Name"}
            </Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Editable Fields */}
          <TextField
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />

          <TextField
            label="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />

          <TextField
            label="Gender"
            name="gender"
            select
            value={formData.gender}
            onChange={handleChange}
            fullWidth
            margin="normal"
          >
            <MenuItem value="Male">Male</MenuItem>
            <MenuItem value="Female">Female</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </TextField>

          <TextField
            label="Profile Picture URL"
            name="photoURL"
            value={formData.photoURL}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />

          {/* Email & Role */}
          <Typography variant="body1" sx={{ mt: 2, color: "#2d3436" }}>
            <strong>Email:</strong> {teacher?.email || currentUser?.email}
          </Typography>
          <Typography variant="body1" sx={{ color: "#2d3436" }}>
            <strong>Role:</strong> {teacher?.role || "Teacher"}
          </Typography>

          <Button
            variant="contained"
            sx={{
              mt: 3,
              bgcolor: "#55efc4",
              color: "#2d3436",
              fontWeight: "bold",
              "&:hover": { bgcolor: "#00cec9" },
              borderRadius: 3,
              px: 3,
            }}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
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
    </TeacherLayout>
  );
};

export default Profile;