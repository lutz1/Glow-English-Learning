import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Divider,
  Paper,
} from "@mui/material";
import { db, auth, storage } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

const AdminSettings = () => {
  const [adminData, setAdminData] = useState({ name: "", email: "", photoURL: "" });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setAdminData(docSnap.data());
          } else {
            setAdminData({ name: user.displayName || "", email: user.email, photoURL: user.photoURL || "" });
          }
        } catch (error) {
          console.error("Error fetching admin data:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateProfile = async () => {
    setLoading(true);
    setErrorMsg(""); setSuccessMsg("");
    try {
      if (!auth.currentUser) throw new Error("No user logged in");
      const docRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(docRef, {
        name: adminData.name,
        photoURL: adminData.photoURL,
        updatedAt: serverTimestamp(),
      });
      setSuccessMsg("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrorMsg("Failed to update profile. Please try again.");
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !auth.currentUser) return;
    setUploadingPhoto(true);
    setErrorMsg(""); setSuccessMsg("");
    try {
      const uid = auth.currentUser.uid;
      const path = `teacherPhotos/${uid}/${Date.now()}_${file.name}`;
      const objRef = storageRef(storage, path);
      await uploadBytes(objRef, file);
      const url = await getDownloadURL(objRef);
      await updateDoc(doc(db, "users", uid), { photoURL: url, updatedAt: serverTimestamp() });
      setAdminData((prev) => ({ ...prev, photoURL: url }));
      setSuccessMsg("Profile photo updated!");
    } catch (error) {
      console.error("Avatar upload error:", error);
      setErrorMsg("Failed to upload photo. Please try again.");
    }
    setUploadingPhoto(false);
  };

  return (
    <Box display="flex" minHeight="100vh" bgcolor="#f4f6f8">
      <Sidebar />
      <Box flexGrow={1} display="flex" flexDirection="column">
        <Topbar title="Admin Settings" />
        <Box p={4}>
          <Paper elevation={3} sx={{ maxWidth: 600, mx: "auto", p: 4, borderRadius: 3,
                                      background: "linear-gradient(135deg, #2c3e50, #34495e)", color: "#fff" }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>Admin Settings</Typography>
            <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,0.2)" }} />
            <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
              <Box position="relative" sx={{ mb: 2 }}>
                <Avatar
                  src={adminData.photoURL || ""}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  sx={{ width: 90, height: 90, bgcolor: "#3498db", fontSize: "2rem", cursor: uploadingPhoto ? "not-allowed" : "pointer", opacity: uploadingPhoto ? 0.7 : 1 }}
                >
                  {!adminData.photoURL && (adminData.name ? adminData.name[0].toUpperCase() : "A")}
                </Avatar>
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarUpload} />
                {uploadingPhoto && (
                  <Typography variant="caption" sx={{ position: "absolute", width: "100%", textAlign: "center", left: 0, bottom: -24, color: "#fff" }}>
                    Uploading...
                  </Typography>
                )}
              </Box>
              <Typography variant="body1" sx={{ opacity: 0.8 }}>{adminData.email}</Typography>
              <Typography variant="caption" sx={{ mt: 1, opacity: 0.7 }}>
                Click avatar to upload a new photo
              </Typography>
            </Box>
            <TextField fullWidth label="Full Name" variant="outlined" value={adminData.name}
                       onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                       sx={{ mb: 2, "& .MuiOutlinedInput-root": { backgroundColor: "#fff", borderRadius: 2 } }} />
            
            <Button fullWidth variant="contained" sx={{ mb: 3, bgcolor: "#f1c40f", color: "#2c3e50", fontWeight: 600 }}
                    onClick={handleUpdateProfile} disabled={loading}>
              {loading ? "Updating..." : "Update Profile"}
            </Button>
            {successMsg && <Typography sx={{ mt: 2, color: "#2ecc71", fontWeight: 600 }}>{successMsg}</Typography>}
            {errorMsg && <Typography sx={{ mt: 2, color: "#e74c3c", fontWeight: 600 }}>{errorMsg}</Typography>}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminSettings;