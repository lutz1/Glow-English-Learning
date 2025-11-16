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
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
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
import bg from "../../assets/christmas.gif"; 
import TeacherSidebar from "../../components/TeacherSidebar";
import TeacherTopbar from "../../components/TeacherTopbar";

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

  // Fetch sessions
  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, "sessions"),
      where("teacherId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => {
        const s = docSnap.data();
        const startTime =
          s.startTime instanceof Timestamp ? s.startTime.toDate() : new Date(s.startTime);
        const endTime =
          s.endTime instanceof Timestamp ? s.endTime.toDate() : s.endTime ? new Date(s.endTime) : null;

        return {
          id: docSnap.id,
          startTime,
          endTime,
          classType: s.classType || "N/A",
          rate: Number(s.rate) || 0,
          status: s.status || "pending",
          totalEarnings:
            s.actualEarnings != null
              ? Number(s.actualEarnings)
              : s.totalEarnings != null
              ? Number(s.totalEarnings)
              : Number(s.rate) || 0,
          screenshotUrl: s.screenshotUrl || s.screenshotBase64 || null,
        };
      });

      data.sort((a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0));
      setSessions(data);
      setLoadingSessions(false);

      // Compute stats
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

      // streak
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

  // Delete session
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this session?")) return;
    try {
      await deleteDoc(doc(db, "sessions", id));
      alert("Session deleted!");
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Reupload screenshot
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
          await updateDoc(doc(db, "sessions", session.id), {
            screenshotUrl: url,
          });
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#ffa726" }}>
            <FiberManualRecordIcon sx={{ fontSize: 14 }} />
            <PlayCircleOutlineIcon sx={{ fontSize: 18 }} /> Ongoing
          </Box>
        );
      case "pending":
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#ccc" }}>
            <FiberManualRecordIcon sx={{ fontSize: 14 }} />
            <HourglassEmptyIcon sx={{ fontSize: 18 }} /> Awaiting
          </Box>
        );
      case "completed":
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#4caf50" }}>
            <FiberManualRecordIcon sx={{ fontSize: 14 }} />
            <DoneAllIcon sx={{ fontSize: 18 }} /> Completed
          </Box>
        );
      default:
        return status;
    }
  };

  const columns = [
    { field: "startTime", headerName: "Date", flex: 1, renderCell: (p) => (p?.value ? new Date(p.value).toLocaleString() : "N/A") },
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
    { field: "delete", headerName: "Delete", flex: 0.4, renderCell: (params) => <IconButton color="error" onClick={() => handleDelete(params.row.id)}><DeleteIcon /></IconButton> },
  ];

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Background GIF */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `url(${bg}) center/cover no-repeat`,
          zIndex: -2,
        }}
      />
      {/* Frosted overlay */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: -1,
        }}
      />

      <TeacherSidebar open={sidebarOpen} onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <Box
        component="main"
        sx={{ flexGrow: 1, width: { md: `calc(100% - ${sidebarOpen ? drawerWidth : 60}px)` }, transition: "width 0.3s", minHeight: "100vh" }}
      >
        <TeacherTopbar open={sidebarOpen} onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        <Box sx={{ flexGrow: 1,mt: 2, overflowY: "auto", px: { xs: 2, sm: 3, md: 3 }, pt: "64px" }}>
  <Typography
    variant="h4"
    fontWeight="bold"
    gutterBottom
    sx={{
      color: "#fff",
      fontFamily: "'Festive', sans-serif",
    }}
  >
    🎄✨ Merry Teaching Dashboard ✨🎄
  </Typography>

  <Grid container spacing={2}>
    {[
      { label: "Today's Earnings", value: `₱${todaysEarnings.toLocaleString()}`, icon: <MonetizationOnIcon sx={{ color: "#ffeb3b"}} /> },
      { label: "Monthly Earnings", value: `₱${monthlyEarnings.toLocaleString()}`, icon: <CalendarTodayIcon sx={{ color: "#4caf50"}} /> },
      { label: "Classes Today", value: todaysCompletedClasses, icon: <CheckCircleIcon sx={{ color: "#ff5252"}} /> },
      { label: "Daily Streak", value: `${streak} days`, icon: <WhatshotIcon sx={{ color: "#ff9800" }} /> },
    ].map((stat, idx) => (
      <Grid item xs={12} sm={6} md={3} key={idx}>
        <Card sx={{
          borderLeft: `6px solid #ff5252`,
          background: "rgba(136, 134, 134, 0.44)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          color: "#fff",
          transform: "scale(1)",
          transition: "transform 0.2s ease",
          "&:hover": {
            transform: "scale(1.03)",
          }
        }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ letterSpacing: 1 }}>{stat.label}</Typography>
            <Typography variant="h5" fontWeight="bold" sx={{ color: "#fff"}}>{stat.value}</Typography>
            {stat.icon}
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>

  <Paper sx={{
    mt: 4,
    p: 3,
    borderRadius: 3,
    background: "rgba(136, 134, 134, 0.44)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    color: "#fff",
  }}>
    <Typography variant="h6" fontWeight="bold" gutterBottom>
      🎁 Weekly Goal Progress
    </Typography>
    <LinearProgress variant="determinate" value={weeklyProgress} sx={{ height: 12, borderRadius: 6, mb: 1, backgroundColor: "rgba(255,255,255,0.2)" }} />
    <Typography variant="body2">{weeklyProgress.toFixed(0)}% of your 20-class goal</Typography>
  </Paper>

  <Box sx={{ mt: 4, overflowX: "auto" }}>
    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: "#fff" }}>
      ❄️ Your Sessions
    </Typography>
    {loadingSessions ? (
      <CircularProgress sx={{ color: "#0a0a0aff" }} />
    ) : (
      <Box sx={{ height: 500, borderRadius: 2, overflow: "hidden" }}>
        <DataGrid
          rows={sessions}
          columns={columns}
          disableSelectionOnClick
          sx={{background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "none",
          color: "#0a0a0aff",
            ".MuiDataGrid-cell": {
              backdropFilter: "blur(14px)",
              background: "rgba(255,255,255,0.05)",
              color: "#0a0a0aff",
            },
            ".MuiDataGrid-columnHeaders": {
              background: "rgba(255,255,255,0.1)",
              color: "#0a0a0aff",
              backdropFilter: "blur(14px)",
            },
            ".MuiDataGrid-footerContainer": {
              background: "rgba(255,255,255,0.1)",
              color: "#0a0a0aff",
              backdropFilter: "blur(14px)",
            },
          }}
        />
      </Box>
    )}
  </Box>
</Box>
      </Box>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogContent sx={{
          position: "relative",
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          color: "#fff",
        }}>
          <IconButton onClick={() => setPreviewOpen(false)} sx={{ position: "absolute", right: 8, top: 8, color: "#fff" }}>
            <CloseIcon />
          </IconButton>

          {previewImage ? (
            <Box component="img" src={previewImage} alt="Screenshot Preview" sx={{ width: "100%", borderRadius: 2 }} />
          ) : (
            <Typography>No screenshot available</Typography>
          )}

          {selectedSession && (
            <Box sx={{ mt: 2 }}>
              <Typography><strong>Date:</strong> {new Date(selectedSession.startTime).toLocaleString()}</Typography>
              <Typography><strong>Class Type:</strong> {selectedSession.classType}</Typography>
              <Typography><strong>Rate:</strong> ₱{Number(selectedSession.rate).toLocaleString()}</Typography>
              <Typography><strong>Earnings:</strong> ₱{Number(selectedSession.totalEarnings).toLocaleString()}</Typography>
              <Typography><strong>Status:</strong> {selectedSession.status}</Typography>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>Reupload Screenshot:</Typography>
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