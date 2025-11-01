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

import bg from "../../assets/bg.gif"; // 🎃 Halloween background

const drawerWidth = 240;

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
    const q = query(
      collection(db, "sessions"),
      where("teacherId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const s = doc.data();
        const startTime =
          s.startTime instanceof Timestamp
            ? s.startTime.toDate()
            : new Date(s.startTime);

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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#ffa726", textShadow: "0 0 6px #ff9800" }}>
            <FiberManualRecordIcon sx={{ fontSize: 14 }} />
            <PlayCircleOutlineIcon sx={{ fontSize: 18 }} /> Ongoing
          </Box>
        );
      case "pending":
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#ccc", textShadow: "0 0 3px #999" }}>
            <FiberManualRecordIcon sx={{ fontSize: 14 }} />
            <HourglassEmptyIcon sx={{ fontSize: 18 }} /> Awaiting
          </Box>
        );
      case "completed":
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#4caf50", textShadow: "0 0 6px #4caf50" }}>
            <FiberManualRecordIcon sx={{ fontSize: 14 }} />
            <DoneAllIcon sx={{ fontSize: 18 }} /> Completed
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
                border: "2px solid #ff9800",
                boxShadow: "0 0 10px #ff9800, 0 0 20px #ff5722",
                transition: "all 0.3s",
                "&:hover": { transform: "scale(1.1)" }
              }}
              onClick={() => {
                setPreviewImage(params.value);
                setSelectedSession(params.row);
                setPreviewOpen(true);
              }}
            />
          </Tooltip>
        ) : "—",
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
    <Box sx={{ display: "flex", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Background & Spooky Overlay */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `url(${bg}) center/cover no-repeat`,
          zIndex: -3,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          width: "200%",
          height: "200%",
          background: "radial-gradient(rgba(0,0,0,0.25), transparent 70%)",
          animation: "smoke 80s linear infinite",
          zIndex: -2,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: "linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.8))",
          zIndex: -1,
        }}
      />
      <style>{`
        @keyframes smoke {
          0% { transform: translate(0,0) rotate(0deg); }
          50% { transform: translate(-20%, -20%) rotate(180deg); }
          100% { transform: translate(0,0) rotate(360deg); }
        }
      `}</style>

      {/* Sidebar */}
      <TeacherSidebar
        open={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${sidebarOpen ? drawerWidth : 60}px)` },
          transition: "width 0.3s",
          minHeight: "100vh",
          color: "#fff",
        }}
      >
        <TeacherTopbar
          open={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <Box sx={{ flexGrow: 1, overflowY: "auto", px: { xs: 2, sm: 3, md: 3 }, pt: "64px" }}>
          {/* Header */}
          <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: "#ff9800", textShadow: "0 0 12px #ff5722" }}>
            🎃 Spooky Teaching Insights
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 2, color: "#f5f5f5", textShadow: "0 0 4px #ff9800" }}>
            Track your classes, boost productivity, and watch your earnings grow… if you dare!
          </Typography>

          {/* Stats Cards */}
          <Grid container spacing={2}>
            {[
              { label: "Today's Earnings", value: `₱${todaysEarnings.toLocaleString()}`, icon: <MonetizationOnIcon />, color: "#ff5722" },
              { label: "Monthly Earnings", value: `₱${monthlyEarnings.toLocaleString()}`, icon: <CalendarTodayIcon />, color: "#ffeb3b" },
              { label: "Classes Today", value: todaysCompletedClasses, icon: <CheckCircleIcon />, color: "#4caf50" },
              { label: "Daily Streak", value: `${streak} days`, icon: <WhatshotIcon />, color: "#f44336" },
            ].map((stat, idx) => (
              <Grid item xs={12} sm={6} md={3} key={idx}>
                <Card sx={{
                  borderLeft: `6px solid ${stat.color}`,
                  background: "rgba(0,0,0,0.65)",
                  color: "#fff",
                  boxShadow: `0 0 15px ${stat.color}, 0 0 30px rgba(255,255,255,0.1)`,
                  transition: "0.3s",
                  "&:hover": { transform: "scale(1.03)", boxShadow: `0 0 25px ${stat.color}, 0 0 50px rgba(255,255,255,0.2)` }
                }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: stat.color }}>{stat.label}</Typography>
                    <Typography variant="h5" fontWeight="bold">{stat.value}</Typography>
                    {stat.icon}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Weekly Progress */}
          <Paper sx={{ mt: 4, p: 3, borderRadius: 3, background: "rgba(0,0,0,0.65)", color: "#fff", boxShadow: "0 0 20px #ff9800" }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Weekly Goal Progress
            </Typography>
            <LinearProgress
              variant="determinate"
              value={weeklyProgress}
              sx={{ height: 12, borderRadius: 6, mb: 1, backgroundColor: "#222", "& .MuiLinearProgress-bar": { backgroundColor: "#ff5722" } }}
            />
            <Typography variant="body2">
              {weeklyProgress.toFixed(0)}% of your 20-class goal
            </Typography>
          </Paper>

          {/* Sessions Table */}
          <Box sx={{ mt: 4, overflowX: "auto" }}>
            <Typography
              variant="h6"
              fontWeight="bold"
              gutterBottom
              sx={{ color: "#ff9800", textShadow: "0 0 10px #ff5722" }}
            >
              Your Sessions
            </Typography>
            {loadingSessions ? (
              <CircularProgress sx={{ color: "#fff" }} />
            ) : (
              <Box sx={{ height: 500, borderRadius: 2, overflow: "hidden" }}>
                <DataGrid
                  rows={sessions}
                  columns={columns}
                  disableSelectionOnClick
                  sx={{
                    border: "none",
                    color: "#fff",
                    background: "transparent",
                    "& .MuiDataGrid-columnHeaders": {
                      background: "transparent",
                      color: "#ff9800",
                      textShadow: "0 0 6px #ff5722",
                      borderBottom: "1px solid rgba(255,152,0,0.3)",
                    },
                    "& .MuiDataGrid-row": {
                      background: "rgba(0,0,0,0.25)",
                      transition: "all 0.3s",
                      "&:hover": {
                        background: "rgba(255,152,0,0.1)",
                        boxShadow: "0 0 15px #ff5722",
                      },
                    },
                    "& .MuiDataGrid-cell": {
                      borderBottom: "1px solid rgba(255,152,0,0.2)",
                    },
                    "& .MuiDataGrid-footerContainer": {
                      background: "rgba(0,0,0,0.3)",
                      borderTop: "1px solid rgba(255,152,0,0.5)",
                    },
                    cursor: "pointer",
                  }}
                  onRowClick={(params) => {
                    setSelectedSession(params.row);
                    setPreviewImage(params.row.screenshotUrl || null);
                    setPreviewOpen(true);
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ position: "relative", background: "#111", color: "#fff", boxShadow: "0 0 20px #ff5722" }}>
          <IconButton onClick={() => setPreviewOpen(false)} sx={{ position: "absolute", right: 8, top: 8, color: "#fff" }}>
            <CloseIcon />
          </IconButton>

          {previewImage ? (
            <Box component="img" src={previewImage} alt="Screenshot Preview" sx={{ width: "100%", borderRadius: 2, boxShadow: "0 0 15px #ff5722" }} />
          ) : (
            <Typography>No screenshot available</Typography>
          )}

          {selectedSession && (
            <Box sx={{ mt: 2 }}>
              <Typography><strong>Date:</strong> {new Date(selectedSession.startTime).toLocaleString()}</Typography>
              <Typography><strong>Class Type:</strong> {selectedSession.classType}</Typography>
              <Typography><strong>Rate:</strong> ₱{selectedSession.rate.toLocaleString()}</Typography>
              <Typography><strong>Earnings:</strong> ₱{selectedSession.totalEarnings.toLocaleString()}</Typography>
              <Typography><strong>Status:</strong> {selectedSession.status}</Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Reupload Screenshot:
              </Typography>
              <Button variant="contained" component="label" sx={{ mt: 1 }}>
                Upload New
                <input type="file" hidden accept="image/*" onChange={(e) => handleReupload(e, selectedSession)} />
              </Button>
              {uploading && <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, height: 10, borderRadius: 2 }} />}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Dashboard;