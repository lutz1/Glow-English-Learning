// src/pages/teacher/Dashboard.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogContent,
  IconButton,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import DeleteIcon from "@mui/icons-material/Delete";

import TeacherSidebar from "../../components/TeacherSidebar";
import TeacherTopbar from "../../components/TeacherTopbar";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const storage = getStorage();

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [todaysEarnings, setTodaysEarnings] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [todaysCompletedClasses, setTodaysCompletedClasses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [weeklyProgress, setWeeklyProgress] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(collection(db, "sessions"), where("teacherId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const s = doc.data();
        const startTime =
          s.startTime instanceof Timestamp ? s.startTime.toDate() : new Date(s.startTime);

        return {
          id: doc.id,
          startTime,
          classType: s.classType || "N/A",
          rate: Number(s.rate) || 0,
          status: s.status || "pending",
          totalEarnings:
            s.actualEarnings != null
              ? Number(s.actualEarnings)
              : Number(s.totalEarnings) || Number(s.rate) || 0,
          screenshotUrl: s.screenshotUrl || s.screenshotBase64 || null,
        };
      });

      data.sort((a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0));
      setSessions(data);
      setLoadingSessions(false);

      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      let todaysTotal = 0,
        monthTotal = 0,
        completedTodayCount = 0,
        completedThisWeek = 0;
      const completedDates = new Set();

      data.forEach((s) => {
        if (s.status === "completed" && s.startTime) {
          const dateKey = s.startTime.toDateString();
          completedDates.add(dateKey);
          if (s.startTime >= startOfToday && s.startTime < endOfToday) {
            todaysTotal += s.totalEarnings;
            completedTodayCount++;
          }
          if (s.startTime >= startOfMonth && s.startTime <= endOfMonth) {
            monthTotal += s.totalEarnings;
          }
          if (s.startTime >= startOfWeek && s.startTime < endOfWeek) completedThisWeek++;
        }
      });

      setTodaysEarnings(todaysTotal);
      setMonthlyEarnings(monthTotal);
      setTodaysCompletedClasses(completedTodayCount);

      let streakCount = 0;
      let checkDate = new Date();
      while (completedDates.has(checkDate.toDateString())) {
        streakCount++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
      setStreak(streakCount);
      const weeklyGoal = 20;
      setWeeklyProgress(Math.min((completedThisWeek / weeklyGoal) * 100, 100));
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this class?")) return;
    try {
      await deleteDoc(doc(db, "sessions", id));
      alert("Deleted successfully!");
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const handleReupload = async (e, session) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setProgress(0);
      const fileRef = ref(storage, `screenshots/${currentUser.uid}/${session.id}.jpg`);
      const uploadTask = uploadBytesResumable(fileRef, file);
      uploadTask.on(
        "state_changed",
        (snap) => setProgress((snap.bytesTransferred / snap.totalBytes) * 100),
        (error) => {
          console.error("Upload failed:", error);
          setUploading(false);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          await updateDoc(doc(db, "sessions", session.id), { screenshotUrl: url });
          setPreviewImage(url);
          setUploading(false);
          alert("Screenshot updated!");
        }
      );
    } catch (err) {
      console.error("Reupload error:", err);
      setUploading(false);
    }
  };

  const renderStatus = (status) => {
    switch (status) {
      case "ongoing":
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FiberManualRecordIcon sx={{ color: "orange", fontSize: 14 }} />
            <PlayCircleOutlineIcon sx={{ color: "orange", fontSize: 18 }} /> Ongoing
          </Box>
        );
      case "pending":
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FiberManualRecordIcon sx={{ color: "gray", fontSize: 14 }} />
            <HourglassEmptyIcon sx={{ color: "gray", fontSize: 18 }} /> Awaiting
          </Box>
        );
      case "completed":
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FiberManualRecordIcon sx={{ color: "green", fontSize: 14 }} />
            <DoneAllIcon sx={{ color: "green", fontSize: 18 }} /> Completed
          </Box>
        );
      default:
        return status;
    }
  };

  const columns = [
    { field: "startTime", headerName: "Date", flex: 1, renderCell: (p) => p?.value ? new Date(p.value).toLocaleString() : "N/A" },
    { field: "classType", headerName: "Class Type", flex: 1 },
    { field: "rate", headerName: "Rate", flex: 0.7, renderCell: (p) => `₱${Number(p.value).toLocaleString()}` },
    { field: "status", headerName: "Status", flex: 1, renderCell: (p) => renderStatus(p.value) },
    { field: "totalEarnings", headerName: "Earnings", flex: 0.8, renderCell: (p) => `₱${Number(p.value).toLocaleString()}` },
    {
      field: "screenshotUrl",
      headerName: "Screenshot",
      flex: 0.6,
      renderCell: (params) =>
        params?.value ? (
          <Tooltip title="Preview">
            <Box
              component="img"
              src={params.value}
              alt="Screenshot"
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                objectFit: "cover",
                cursor: "pointer",
                border: "2px solid #fff",
              }}
              onClick={() => {
                setPreviewImage(params.value);
                setSelectedSession(params.row);
                setPreviewOpen(true);
              }}
            />
          </Tooltip>
        ) : (
          "—"
        ),
    },
    {
      field: "delete",
      headerName: "Delete",
      flex: 0.4,
      renderCell: (params) => (
        <IconButton color="error" onClick={() => handleDelete(params.row.id)}>
          <DeleteIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <Box sx={{ display: "flex" }}>
      {/* Sidebar */}
      <TeacherSidebar
        open={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Main content */}
      <Box
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          width: "100%",
          transition: "all 0.3s ease",
          display: "flex",
          background:
            "linear-gradient(135deg, rgba(220, 218, 253, 0.85), rgba(116,185,255,0.85), rgba(129,236,236,0.85))",
          flexDirection: "column",
        }}
      >
        {/* Topbar fixed at top */}
        <TeacherTopbar
          open={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        {/* Scrollable content */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            px: { xs: 3, sm: 3, md: 3 },
            pt: '64px', // fixed padding top, matches Topbar height
          }}
        >
          {/* Dashboard content */}
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Teaching Insights ✨
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 2, color: "#666" }}>
            Track your classes, boost productivity, and see your earnings grow.
          </Typography>

          {/* Stats Cards */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderLeft: "4px solid #2196f3" }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Today's Earnings
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    ₱{todaysEarnings.toLocaleString()}
                  </Typography>
                  <MonetizationOnIcon color="primary" />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderLeft: "4px solid #4caf50" }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Monthly Earnings
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    ₱{monthlyEarnings.toLocaleString()}
                  </Typography>
                  <CalendarTodayIcon color="success" />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderLeft: "4px solid #ff9800" }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Classes Today
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {todaysCompletedClasses}
                  </Typography>
                  <CheckCircleIcon color="warning" />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderLeft: "4px solid #f44336" }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Daily Streak
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {streak} days
                  </Typography>
                  <WhatshotIcon color="error" />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Weekly Progress */}
          <Paper sx={{ mt: 4, p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Weekly Goal Progress
            </Typography>
            <LinearProgress
              variant="determinate"
              value={weeklyProgress}
              sx={{
                height: 12,
                borderRadius: 6,
                mb: 1,
                backgroundColor: "#d7e3fc",
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {weeklyProgress.toFixed(0)}% of your 20-class goal
            </Typography>
          </Paper>

          {/* Sessions Table */}
          <Box sx={{ mt: 4, overflowX: "auto" }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Your Sessions
            </Typography>
            {loadingSessions ? (
              <CircularProgress />
            ) : (
              <Paper sx={{ height: 500, borderRadius: 2, overflow: "hidden" }}>
                <DataGrid
                  rows={sessions}
                  columns={columns}
                  disableSelectionOnClick
                  sx={{
                    border: "none",
                    "& .MuiDataGrid-virtualScroller": { overflowX: "hidden" },
                  }}
                />
              </Paper>
            )}
          </Box>
        </Box>
      </Box>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ position: "relative" }}>
          <IconButton
            onClick={() => setPreviewOpen(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>

          {previewImage ? (
            <Box
              component="img"
              src={previewImage}
              alt="Screenshot Preview"
              sx={{ width: "100%", borderRadius: 2 }}
            />
          ) : (
            <Typography>No screenshot available</Typography>
          )}

          {selectedSession && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Reupload Screenshot:
              </Typography>
              <Button variant="contained" component="label" sx={{ mt: 1 }}>
                Upload New
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => handleReupload(e, selectedSession)}
                />
              </Button>
              {uploading && (
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ mt: 2, height: 10, borderRadius: 2 }}
                />
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Dashboard;