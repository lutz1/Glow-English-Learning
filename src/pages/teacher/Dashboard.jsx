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
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import TeacherLayout from "../../layout/TeacherLayout";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";

// Icons
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WhatshotIcon from "@mui/icons-material/Whatshot";

const Dashboard = () => {
  const { currentUser, loading } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Stats
  const [todaysEarnings, setTodaysEarnings] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [todaysCompletedClasses, setTodaysCompletedClasses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [weeklyProgress, setWeeklyProgress] = useState(0);

  // Modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, "sessions"),
      where("teacherId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const s = doc.data();

          let startTime = null;
          if (s.startTime instanceof Timestamp) {
            startTime = s.startTime.toDate();
          } else if (typeof s.startTime === "string") {
            startTime = new Date(s.startTime);
          }

          return {
            id: doc.id,
            startTime,
            classType: s.classType || "N/A",
            rate: typeof s.rate === "number" ? s.rate : Number(s.rate) || 0,
            status: s.status || "pending",
            totalEarnings:
              typeof s.totalEarnings === "number"
                ? s.totalEarnings
                : Number(s.rate) || 0,
            screenshotBase64: s.screenshotBase64 || null,
          };
        });

        // Sort by date desc
        data.sort(
          (a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0)
        );

        setSessions(data);
        setLoadingSessions(false);

        // === Stats ===
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        let todaysTotal = 0;
        let monthTotal = 0;
        let completedTodayCount = 0;
        let completedThisWeek = 0;

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
            if (s.startTime >= startOfWeek && s.startTime < endOfWeek) {
              completedThisWeek++;
            }
          }
        });

        setTodaysEarnings(todaysTotal);
        setMonthlyEarnings(monthTotal);
        setTodaysCompletedClasses(completedTodayCount);

        // === Streak calculation ===
        let streakCount = 0;
        let checkDate = new Date();
        while (completedDates.has(checkDate.toDateString())) {
          streakCount++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
        setStreak(streakCount);

        // === Weekly progress ===
        const weeklyGoal = 20; // example goal
        setWeeklyProgress(Math.min((completedThisWeek / weeklyGoal) * 100, 100));
      },
      (error) => {
        console.error("Error fetching sessions:", error);
        setLoadingSessions(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Render status
  const renderStatus = (status) => {
    switch (status) {
      case "ongoing":
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FiberManualRecordIcon sx={{ color: "orange", fontSize: 14 }} />
            <PlayCircleOutlineIcon sx={{ color: "orange", fontSize: 18 }} />
            Ongoing
          </Box>
        );
      case "awaiting_screenshot":
      case "pending":
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FiberManualRecordIcon sx={{ color: "gray", fontSize: 14 }} />
            <HourglassEmptyIcon sx={{ color: "gray", fontSize: 18 }} />
            Awaiting
          </Box>
        );
      case "completed":
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FiberManualRecordIcon sx={{ color: "green", fontSize: 14 }} />
            <DoneAllIcon sx={{ color: "green", fontSize: 18 }} />
            Completed
          </Box>
        );
      default:
        return status;
    }
  };

  const columns = [
    {
      field: "startTime",
      headerName: "Date",
      flex: 1,
      renderCell: (params) =>
        params?.value ? new Date(params.value).toLocaleString() : "N/A",
    },
    {
      field: "classType",
      headerName: "Class Type",
      flex: 1,
    },
    {
      field: "rate",
      headerName: "Rate",
      flex: 0.7,
      renderCell: (params) =>
        params?.value != null ? `₱${Number(params.value).toLocaleString()}` : "₱0",
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => renderStatus(params?.value),
    },
    {
      field: "totalEarnings",
      headerName: "Earnings",
      flex: 0.8,
      renderCell: (params) =>
        params?.value != null ? `₱${Number(params.value).toLocaleString()}` : "₱0",
    },
    {
      field: "screenshotBase64",
      headerName: "Screenshot",
      flex: 0.6,
      renderCell: (params) =>
        params?.value ? (
          <Tooltip title="Click to preview">
            <Box
              component="img"
              src={params.value}
              alt="Screenshot"
              sx={{
                width: 48,
                height: 48,
                objectFit: "cover",
                borderRadius: "50%",
                cursor: "pointer",
                border: "2px solid #fff",
              }}
              onClick={() => {
                setPreviewImage(params.value);
                setPreviewOpen(true);
              }}
            />
          </Tooltip>
        ) : (
          "—"
        ),
    },
  ];

  if (loading) {
    return (
      <TeacherLayout>
        <Box sx={{ p: 3, textAlign: "center" }}>
          <CircularProgress />
        </Box>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <Box sx={{ p: 3, height: "100%" }}>
        {/* Header */}
        <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ color: "#333" }}>
          Teaching Insights ✨
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 2, color: "#666" }}>
          Track your classes, boost productivity, and see your earnings grow.
        </Typography>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={3}>
            <Card sx={{ background: "linear-gradient(135deg, #43e97b, #38f9d7)", color: "white" }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <MonetizationOnIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="subtitle2">Today's Earnings</Typography>
                  <Typography variant="h6" fontWeight="bold">
                    ₱{todaysEarnings.toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card sx={{ background: "linear-gradient(135deg, #56ccf2, #2f80ed)", color: "white" }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <CalendarTodayIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="subtitle2">This Month</Typography>
                  <Typography variant="h6" fontWeight="bold">
                    ₱{monthlyEarnings.toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Card sx={{ background: "linear-gradient(135deg, #a18cd1, #fbc2eb)", color: "white" }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="subtitle2">Completed Today</Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {todaysCompletedClasses}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          {/* Streak Tracker */}
          <Grid item xs={12} sm={3}>
            <Card sx={{ background: "linear-gradient(135deg, #ff9a9e, #fad0c4)", color: "white" }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <WhatshotIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="subtitle2">Streak</Typography>
                  <Typography variant="h6" fontWeight="bold">
                    🔥 {streak}-Day
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Weekly Progress */}
        <Card sx={{ mb: 3, p: 2, borderRadius: 3, boxShadow: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
            Weekly Goal Progress
          </Typography>
          <LinearProgress
            variant="determinate"
            value={weeklyProgress}
            sx={{
              height: 12,
              borderRadius: 6,
              "& .MuiLinearProgress-bar": {
                background: "linear-gradient(90deg, #43e97b, #38f9d7)",
              },
            }}
          />
          <Typography variant="caption" sx={{ display: "block", mt: 1, color: "#666" }}>
            {Math.round(weeklyProgress)}% of weekly goal completed
          </Typography>
        </Card>

        {/* Table */}
        <Paper
          sx={{
            mt: 2,
            p: 1,
            borderRadius: 3,
            boxShadow: 4,
            "& .MuiDataGrid-root": {
              borderRadius: 3,
              backgroundColor: "white",
            },
            "& .MuiDataGrid-row:nth-of-type(odd)": {
              backgroundColor: "#fafafa",
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "#f0f8ff",
              transition: "0.2s",
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f5f5f5",
              fontWeight: "bold",
              fontSize: "1rem",
            },
          }}
        >
          {loadingSessions ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          ) : (
            <DataGrid
              rows={sessions}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10]}
              disableSelectionOnClick
              autoHeight
              getRowClassName={() => ""}
            />
          )}
        </Paper>

        {/* Screenshot Preview */}
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth="md"
          fullWidth
          sx={{ zIndex: 1500 }}
        >
          <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
            <IconButton onClick={() => setPreviewOpen(false)} sx={{ color: "white" }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <DialogContent sx={{ textAlign: "center" }}>
            <Box
              component="img"
              src={previewImage}
              alt="Full Screenshot"
              sx={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: 2,
                boxShadow: 3,
              }}
            />
          </DialogContent>
        </Dialog>
      </Box>
    </TeacherLayout>
  );
};

export default Dashboard;