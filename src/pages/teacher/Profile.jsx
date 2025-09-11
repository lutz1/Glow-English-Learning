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
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useAuth } from "../../hooks/useAuth";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import TeacherLayout from "../../layout/TeacherLayout";

const storage = getStorage();

const Profile = () => {
  const { currentUser } = useAuth();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
    gcashQR: "",
  });

  // Dialogs
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tempQR, setTempQR] = useState(null);

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
            gcashQR: data.gcashQR || "", // ✅ load saved QR directly
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

  // Handle QR Upload
  const handleUploadQR = async (e) => {
  if (!teacher?.id) {
    setSnackbar({
      open: true,
      message: "Teacher account not ready yet. Please save profile first.",
      severity: "error",
    });
    return;
  }

  const file = e.target.files[0];
  if (!file) return;

  setLoading(true);
  setUploadProgress(0);

  try {
    // ✅ unique filename
    const uniqueName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `gcashQR/${teacher.id}/${uniqueName}`);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Error uploading QR:", error);
        setSnackbar({
          open: true,
          message: "Failed to upload GCash QR. " + (error.message || ""),
          severity: "error",
        });
        setLoading(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setTempQR(downloadURL); // show preview before saving
        setPreviewDialogOpen(true);
        setLoading(false);
      }
    );
  } catch (error) {
    console.error("Error uploading QR:", error);
    setSnackbar({
      open: true,
      message: "Failed to upload GCash QR. " + (error.message || ""),
      severity: "error",
    });
    setLoading(false);
  }
};

  // Confirm Save QR after preview
  const confirmSaveQR = async () => {
    if (!teacher?.id || !tempQR) return;
    setLoading(true);

    try {
      const teacherRef = doc(db, "users", teacher.id);
      await updateDoc(teacherRef, {
        gcashQR: tempQR,
        updatedAt: serverTimestamp(),
      });
      setFormData((prev) => ({ ...prev, gcashQR: tempQR }));
      setSnackbar({
        open: true,
        message: "GCash QR saved successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error saving QR:", error);
      setSnackbar({
        open: true,
        message: "Failed to save GCash QR.",
        severity: "error",
      });
    } finally {
      setTempQR(null);
      setPreviewDialogOpen(false);
      setLoading(false);
    }
  };

  // Handle Delete QR
  // Handle Delete QR
const handleDeleteQR = async () => {
  if (!teacher?.id || !formData.gcashQR) return;
  setLoading(true);

  try {
    // ✅ Create ref from the existing download URL
    const fileRef = storageRef(storage, formData.gcashQR);
    await deleteObject(fileRef);

    // ✅ Clear from Firestore
    const teacherRef = doc(db, "users", teacher.id);
    await updateDoc(teacherRef, { gcashQR: "", updatedAt: serverTimestamp() });

    setFormData((prev) => ({ ...prev, gcashQR: "" }));

    setSnackbar({
      open: true,
      message: "GCash QR removed successfully!",
      severity: "success",
    });
  } catch (error) {
    console.error("Error removing QR:", error);
    setSnackbar({
      open: true,
      message: "Failed to remove GCash QR.",
      severity: "error",
    });
  } finally {
    setDeleteDialogOpen(false);
    setLoading(false);
  }
};

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

      const updateData = {
        name: formData.name || "",
        phone: formData.phone || "",
        gender: formData.gender || "",
        updatedAt: serverTimestamp(),
      };

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
              {!formData.photoURL &&
                (formData.name ? formData.name[0].toUpperCase() : "T")}
            </Avatar>
            <Typography
              variant="h5"
              sx={{ color: "#2d3436", fontWeight: "bold" }}
            >
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

          {/* GCash QR Upload */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              GCash QR Code for Payroll
            </Typography>

            {formData.gcashQR ? (
              <Box sx={{ mt: 1, mb: 2 }}>
                <img
                  src={formData.gcashQR}
                  alt="GCash QR"
                  style={{
                    maxWidth: "200px",
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                  }}
                />
                <Box sx={{ mt: 1 }}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Remove QR
                  </Button>
                </Box>
              </Box>
            ) : (
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{ mb: 1 }}
              >
                No QR uploaded yet
              </Typography>
            )}

            {loading && uploadProgress > 0 && uploadProgress < 100 && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Uploading... {Math.round(uploadProgress)}%
                </Typography>
              </Box>
            )}

            <Button variant="outlined" component="label" disabled={loading}>
              Upload GCash QR
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleUploadQR}
              />
            </Button>
          </Box>

          {/* Email & Role */}
          <Typography variant="body1" sx={{ mt: 3, color: "#2d3436" }}>
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

      {/* Upload Preview Confirmation Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
      >
        <DialogTitle>Confirm GCash QR Upload</DialogTitle>
        <DialogContent>
          {tempQR && (
            <img
              src={tempQR}
              alt="Preview QR"
              style={{
                maxWidth: "100%",
                borderRadius: "8px",
                marginTop: "10px",
              }}
            />
          )}
          <Typography variant="body2" sx={{ mt: 2 }}>
            Please confirm this is the correct GCash QR code before saving.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={confirmSaveQR}
            variant="contained"
            color="primary"
          >
            Confirm & Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Remove GCash QR Code</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove your GCash QR code? This cannot
            be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteQR}
            variant="contained"
            color="error"
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

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