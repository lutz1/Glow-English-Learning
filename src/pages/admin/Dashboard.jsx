import React, { useEffect, useState } from "react";
import {
  Grid,
  Typography,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Divider,
  ButtonGroup,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  Dialog,
} from "@mui/material";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import SchoolIcon from "@mui/icons-material/School";
import PaidIcon from "@mui/icons-material/Paid";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import AdminLayout from "../../layout/AdminLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Define class type colors
const classTypeColors = {
  "Chinese Class": { bgcolor: "#e53935", color: "#fff" },
  "Private Class": { bgcolor: "#3949ab", color: "#fff" },
  IELTS: { bgcolor: "#00897b", color: "#fff" },
  "Vietnamese Class": { bgcolor: "#fbc02d", color: "#000" },
  "Group Class": { bgcolor: "#8e24aa", color: "#fff" },
  Default: { bgcolor: "#64b5f6", color: "#fff" },
};

// Dashboard Component
const Dashboard = () => {
  const [teacherCount, setTeacherCount] = useState(0);
  const [teachersMap, setTeachersMap] = useState({});
  const [totalPayroll, setTotalPayroll] = useState(0);
  const [pendingPayroll, setPendingPayroll] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [earningData, setEarningData] = useState([]);
  const [topTeachers, setTopTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("weekly");

  // For screenshot lightbox
  const [openScreenshot, setOpenScreenshot] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  const updateChartData = (sessionsArray) => {
    const teacherData = {};
    sessionsArray
      .filter((s) => s.status === "completed")
      .forEach((s) => {
        const teacherName =
          teachersMap[s.teacherId]?.name || s.teacherName || s.teacherId;
        const classType = s.classType || "Default";
        const earnings = s.totalEarnings || 0;

        if (!teacherData[teacherName]) {
          teacherData[teacherName] = { teacherName };
        }
        teacherData[teacherName][classType] =
          (teacherData[teacherName][classType] || 0) + earnings;
      });

    setEarningData(Object.values(teacherData));
  };

  // Load teachers
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const teachers = snapshot.docs
        .filter((doc) => doc.data().role === "teacher")
        .map((doc) => ({ id: doc.id, ...doc.data() }));

      setTeacherCount(teachers.length);

      const map = {};
      teachers.forEach((t) => {
        map[t.id] = { name: t.name, photoURL: t.photoURL };
      });
      setTeachersMap(map);
    });

    return () => unsubUsers();
  }, []);

  // Load sessions
  useEffect(() => {
    const unsubSessions = onSnapshot(collection(db, "sessions"), (snapshot) => {
      const allSessions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      setSessions(allSessions.slice(0, 50));

      setTotalPayroll(
        allSessions
          .filter((s) => s.status === "completed")
          .reduce((acc, s) => acc + (s.totalEarnings || 0), 0)
      );

      setPendingPayroll(
        allSessions
          .filter((s) => s.status === "pending")
          .reduce((acc, s) => acc + (s.totalEarnings || 0), 0)
      );

      const earningsByTeacher = {};
      allSessions
        .filter((s) => s.status === "completed")
        .forEach((s) => {
          earningsByTeacher[s.teacherId] =
            (earningsByTeacher[s.teacherId] || 0) + (s.totalEarnings || 0);
        });

      const ranked = Object.entries(earningsByTeacher)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, earnings]) => ({
          id,
          earnings,
          name: teachersMap[id]?.name || "Unknown",
          photoURL: teachersMap[id]?.photoURL || "",
        }));

      setTopTeachers(ranked);
      updateChartData(allSessions);
      setLoading(false);
    });

    return () => unsubSessions();
  }, [period, teachersMap]);

  if (loading)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(160deg, #2c3e50, #34495e, #2c3e50)",
        }}
      >
        <CircularProgress sx={{ color: "#fff" }} />
      </Box>
    );

  const statusColors = {
    completed: "success",
    pending: "warning",
    ongoing: "info",
  };

  const glassCard = {
    background: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(18px)",
    borderRadius: "18px",
    boxShadow: "0 16px 32px rgba(0,0,0,0.5)",
    color: "#fff",
  };

  return (
    <AdminLayout>
      <Box
        sx={{
          p: 3,
          minHeight: "100vh",
          background: "linear-gradient(160deg, #2c3e50, #34495e, #2c3e50)",
          color: "#fff",
        }}
      >
        {/* HEADER */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h4" fontWeight="bold">
            Admin Dashboard Overview
          </Typography>
        </Box>

        <Divider sx={{ mb: 3, borderColor: "rgba(255,255,255,0.2)" }} />

        <Grid container spacing={3}>
          {/* CARDS */}
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={glassCard}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <SchoolIcon fontSize="large" sx={{ color: "#64b5f6" }} />
                <Box>
                  <Typography variant="subtitle2">Total Teachers</Typography>
                  <Typography variant="h5">{teacherCount}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={glassCard}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <PaidIcon fontSize="large" sx={{ color: "#81c784" }} />
                <Box>
                  <Typography variant="subtitle2">Total Payroll</Typography>
                  <Typography variant="h5">₱{totalPayroll.toFixed(2)}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card sx={glassCard}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <HourglassEmptyIcon fontSize="large" sx={{ color: "#ffb74d" }} />
                <Box>
                  <Typography variant="subtitle2">Pending Earnings</Typography>
                  <Typography variant="h5">₱{pendingPayroll.toFixed(2)}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* CHART */}
          {/* CHART */}
<Grid item xs={12} md={8}>
  <Card sx={{ ...glassCard, height: 450, position: "relative", overflow: "hidden" }}>
    <CardContent>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6">Earnings Summary</Typography>
        <ButtonGroup size="small">
          <Button
            variant={period === "weekly" ? "contained" : "outlined"}
            onClick={() => setPeriod("weekly")}
          >
            Weekly
          </Button>
          <Button
            variant={period === "monthly" ? "contained" : "outlined"}
            onClick={() => setPeriod("monthly")}
          >
            Monthly
          </Button>
        </ButtonGroup>
      </Box>

      {/* Chart stays here (hidden behind overlay) */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={earningData}>
          {/* ...chart content */}
        </BarChart>
      </ResponsiveContainer>

      {/* Overlay for Coming Soon */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          bgcolor: "rgba(0,0,0,0.75)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backdropFilter: "blur(4px)",
          color: "#fff",
          textAlign: "center",
        }}
      >
        {/* Animated Builder */}
        <div className="builder-animation">
          <span className="emoji">👷‍♂️</span>
          <span className="emoji">🔨</span>
        </div>

        <Typography
          variant="h5"
          sx={{
            fontWeight: "bold",
            mt: 2,
            mb: 1,
            background: "linear-gradient(90deg, #64b5f6, #81c784, #ffb74d)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Feature Coming Soon
        </Typography>

        <Typography
          variant="body2"
          sx={{ color: "rgba(255,255,255,0.7)" }}
        >
          We’re crafting advanced analytics for you.<br />
          Stay tuned for updates 🚀
        </Typography>
      </Box>
    </CardContent>
  </Card>

  {/* Animations */}
  <style>
    {`
      .builder-animation {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 3rem;
        gap: 0.5rem;
      }

      .builder-animation .emoji {
        display: inline-block;
        animation: bounce 1.5s infinite;
      }

      .builder-animation .emoji:nth-child(2) {
        animation: hammer 1.2s infinite;
      }

      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }

      @keyframes hammer {
        0% { transform: rotate(0deg); }
        25% { transform: rotate(-30deg); }
        50% { transform: rotate(0deg); }
        75% { transform: rotate(-30deg); }
        100% { transform: rotate(0deg); }
      }
    `}
  </style>
</Grid>

          {/* TOP TEACHERS */}
          <Grid item xs={12} md={4}>
            <Card sx={{ ...glassCard, height: 450 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", color: "#64b5f6" }}>
                  🌟 Top Teachers
                </Typography>
                <List>
                  {topTeachers.map((t, idx) => (
                    <React.Fragment key={t.id}>
                      <ListItem
                        sx={{
                          borderRadius: "12px",
                          "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
                        }}
                      >
                        <Avatar src={t.photoURL || ""} alt={t.name || t.id} sx={{ mr: 2 }} />
                        <Typography sx={{ fontWeight: "bold", flex: 1 }}>{t.name}</Typography>
                        <Typography>₱{t.earnings.toFixed(2)}</Typography>
                        {idx < 3 && (
                          <EmojiEventsIcon
                            sx={{
                              ml: 1,
                              color: idx === 0 ? "gold" : idx === 1 ? "silver" : "#cd7f32",
                            }}
                          />
                        )}
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* LATEST SESSIONS */}
          <Grid item xs={12}>
            <Card sx={glassCard}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", color: "#64b5f6" }}>
                  📅 Latest Sessions
                </Typography>

                {/* Header Row */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 2fr 1fr 1fr",
                    p: 1.5,
                    borderRadius: "10px",
                    mb: 1,
                    fontWeight: "bold",
                    bgcolor: "rgba(255,255,255,0.12)",
                    textAlign: "center",
                  }}
                >
                  <Typography>👩‍🏫 Teacher</Typography>
                  <Typography>📌 Status</Typography>
                  <Typography>⏰ Time</Typography>
                  <Typography>💰 Earnings</Typography>
                  <Typography>🖼 Screenshot</Typography>
                </Box>

                {/* Session List */}
                <List sx={{ maxHeight: 400, overflow: "auto" }}>
                  {sessions.map((s) => {
                    const teacher = teachersMap[s.teacherId] || {};
                    return (
                      <ListItem
                        key={s.id}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "2fr 1fr 2fr 1fr 1fr",
                          alignItems: "center",
                          p: 1.5,
                          mb: 1,
                          borderRadius: "12px",
                          bgcolor: "rgba(255,255,255,0.05)",
                          "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                          textAlign: "center",
                        }}
                      >
                        {/* Teacher */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar src={teacher.photoURL || ""} />
                          <Box sx={{ textAlign: "left" }}>
                            <Typography sx={{ fontWeight: "bold" }}>
                              {teacher.name || s.teacherName || s.teacherId}
                            </Typography>
                            <Chip
                              label={s.classType}
                              size="small"
                              sx={{
                                mt: 0.5,
                                fontWeight: "bold",
                                ...(classTypeColors[s.classType] || classTypeColors.Default),
                              }}
                            />
                          </Box>
                        </Box>

                        {/* Status */}
                        <Chip
                          label={s.status}
                          size="small"
                          color={statusColors[s.status] || "default"}
                        />

                        {/* Time */}
                        <Box>
                          <Typography sx={{ fontSize: "0.75rem" }}>
                            {s.startTime?.toDate ? s.startTime.toDate().toLocaleString() : "-"}
                          </Typography>
                          <Typography sx={{ fontSize: "0.75rem" }}>
                            {s.endTime?.toDate ? s.endTime.toDate().toLocaleString() : "-"}
                          </Typography>
                        </Box>

                        {/* Earnings */}
                        <Typography sx={{ fontWeight: "bold", color: "#81c784" }}>
                          ₱{s.totalEarnings?.toFixed(2) || "0.00"}
                        </Typography>

                        {/* Screenshot */}
                        <Box>
                          {s.screenshotUrl ? (
                            <img
                              src={s.screenshotUrl}
                              alt="Session Screenshot"
                              style={{
                                width: 60,
                                height: 40,
                                objectFit: "cover",
                                borderRadius: "6px",
                                border: "1px solid rgba(255,255,255,0.2)",
                                cursor: "pointer",
                                transition: "transform 0.2s ease",
                              }}
                              onClick={() => {
                                setSelectedScreenshot(s.screenshotUrl);
                                setOpenScreenshot(true);
                              }}
                            />
                          ) : (
                            <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.6)" }}>
                              N/A
                            </Typography>
                          )}
                        </Box>
                      </ListItem>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Screenshot Lightbox */}
      {selectedScreenshot && (
        <Dialog
          open={openScreenshot}
          onClose={() => setOpenScreenshot(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { background: "rgba(0,0,0,0.9)", boxShadow: "none" },
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              p: 2,
              position: "relative",
            }}
          >
            <img
              src={selectedScreenshot}
              alt="Screenshot Preview"
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: "10px",
                objectFit: "contain",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: 10,
                right: 10,
                cursor: "pointer",
                color: "#fff",
                fontWeight: "bold",
                fontSize: "1.2rem",
                p: 1,
              }}
              onClick={() => setOpenScreenshot(false)}
            >
              ✕
            </Box>
          </Box>
        </Dialog>
      )}
    </AdminLayout>
  );
};

export default Dashboard;