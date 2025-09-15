// src/pages/admin/Dashboard.jsx
import React, { useEffect, useState, useRef } from "react";
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
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import SchoolIcon from "@mui/icons-material/School";
import PaidIcon from "@mui/icons-material/Paid";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import AdminLayout from "../../layout/AdminLayout";
import GetAppIcon from "@mui/icons-material/GetApp";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Define class type colors
const classTypeColors = {
  "Chinese Class": { bgcolor: "#e53935", color: "#fff" },
  "Private Class": { bgcolor: "#3949ab", color: "#fff" },
  IELTS: { bgcolor: "#00897b", color: "#fff" },
  "Vietnamese Class": { bgcolor: "#fbc02d", color: "#000" },
  "Group Class": { bgcolor: "#8e24aa", color: "#fff" },
  Default: { bgcolor: "#64b5f6", color: "#fff" },
};

// Styling for glass cards
const glassCard = {
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(12px)",
  borderRadius: "14px",
  boxShadow: "0 12px 24px rgba(0,0,0,0.45)",
  color: "#fff",
};

const statusColors = {
  completed: "success",
  pending: "warning",
  ongoing: "info",
};

const Dashboard = () => {
  const [teacherCount, setTeacherCount] = useState(0);
  const [teachersMap, setTeachersMap] = useState({});
  const [totalPayroll, setTotalPayroll] = useState(0);
  const [pendingPayroll, setPendingPayroll] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [earningData, setEarningData] = useState([]);
  const [topTeachers, setTopTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("monthly");
  // Date range override (nullable). When null, we use current month automatically.
  const [dateRange, setDateRange] = useState({
    start: null,
    end: null,
  });
  const [openScreenshot, setOpenScreenshot] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const topTeachersRef = useRef(null);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper: first and last day of current month
  const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const end = new Date(now.getFullYear(), now.getMonth(), lastDay, 23, 59, 59);
    return { start, end, label: `${start.toLocaleDateString()} — ${end.toLocaleDateString()}` };
  };

  // When no dateRange provided, use current month
  const effectiveRange = () => {
    if (dateRange.start && dateRange.end) {
      const s = new Date(dateRange.start);
      s.setHours(0, 0, 0, 0);
      const e = new Date(dateRange.end);
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e, label: `${s.toLocaleDateString()} — ${e.toLocaleDateString()}` };
    }
    return getCurrentMonthRange();
  };

  // Load teachers map
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const teachers = snapshot.docs
        .filter((d) => d.data()?.role === "teacher")
        .map((d) => ({ id: d.id, ...d.data() }));

      setTeacherCount(teachers.length);

      const map = {};
      teachers.forEach((t) => {
        map[t.id] = {
          name: t.name || `${t.firstName || ""} ${t.lastName || ""}`.trim() || "Unknown",
          photoURL: t.photoURL || "",
        };
      });
      setTeachersMap(map);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Load sessions
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, "sessions"), (snapshot) => {
      const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      // keep some reasonable limit for list performance
      setSessions(all.slice(0, 200));
      // totals across all sessions
      setTotalPayroll(
        all.filter((s) => s.status === "completed").reduce((acc, s) => acc + (s.totalEarnings || 0), 0)
      );
      setPendingPayroll(
        all.filter((s) => s.status === "pending").reduce((acc, s) => acc + (s.totalEarnings || 0), 0)
      );

      // update chart data (simple summary)
      updateChartData(all);

      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Recompute top teachers whenever sessions or teacher map or dateRange / period change
  useEffect(() => {
    computeTopTeachers();

  }, [sessions, teachersMap, dateRange, period]);

  const updateChartData = (sessionsArray) => {
    const teacherData = {};
    sessionsArray
      .filter((s) => s.status === "completed")
      .forEach((s) => {
        const tName = teachersMap[s.teacherId]?.name || s.teacherName || s.teacherId;
        const classType = s.classType || "Default";
        const earnings = s.totalEarnings || 0;

        if (!teacherData[tName]) teacherData[tName] = { teacherName: tName };
        teacherData[tName][classType] = (teacherData[tName][classType] || 0) + earnings;
      });

    setEarningData(Object.values(teacherData));
  };

  const computeTopTeachers = () => {
    const { start, end } = effectiveRange();
    // Filter sessions that are completed and in the range
    const filtered = sessions.filter((s) => {
      if (s.status !== "completed") return false;
      // s.endTime may be Firestore timestamp object; check both forms
      const ts = s.endTime?.toDate ? s.endTime.toDate() : s.endTime ? new Date(s.endTime) : null;
      if (!ts) return false;
      return ts >= start && ts <= end;
    });

    const earningsByTeacher = {};
    filtered.forEach((s) => {
      const id = s.teacherId || s.teacherUID || s.teacher;
      if (!id) return;
      earningsByTeacher[id] = (earningsByTeacher[id] || 0) + (s.totalEarnings || 0);
    });

    const ranked = Object.entries(earningsByTeacher)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // take top 10 for display
      .map(([id, earnings], index) => ({
        id,
        earnings,
        name: teachersMap[id]?.name || "Unknown",
        photoURL: teachersMap[id]?.photoURL || "",
        rank: index + 1,
      }));

    setTopTeachers(ranked);
  };

  // Export PDF of Top Teachers card
  const exportTopTeachersToPDF = async () => {
    if (!topTeachersRef.current) return;
    const el = topTeachersRef.current;

    // increase pixel ratio for better resolution
    const canvas = await html2canvas(el, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");

    // create pdf sized to image ratio (A4 portrait)
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // compute image dimensions while preserving ratio
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pageWidth - 20; // 10mm margin each side
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
    pdf.save(`top-teachers-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Handlers for date pickers
  const handleDateChange = (field) => (e) => {
    setDateRange((prev) => ({ ...prev, [field]: e.target.value || null }));
  };

  // UI when loading
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

  // Helper to render ranking badge
  const RankingBadge = ({ rank }) => {
    if (rank === 1) {
      return <Chip label="🥇 1st" size="small" sx={{ ml: 1, bgcolor: "#FFD700", color: "#000" }} />;
    }
    if (rank === 2) {
      return <Chip label="🥈 2nd" size="small" sx={{ ml: 1, bgcolor: "#C0C0C0", color: "#000" }} />;
    }
    if (rank === 3) {
      return <Chip label="🥉 3rd" size="small" sx={{ ml: 1, bgcolor: "#CD7F32", color: "#000" }} />;
    }
    return <Chip label={`#${rank}`} size="small" sx={{ ml: 1, bgcolor: "rgba(255,255,255,0.06)" }} />;
  };

  const { start: effStart, end: effEnd, label: rangeLabel } = effectiveRange();

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
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h4" fontWeight="bold">
            Admin Dashboard Overview
          </Typography>

          {/* Live clock */}
          <Typography variant="h6" sx={{ fontWeight: "bold", color: "#64b5f6" }}>
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
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

          {/* EARNINGS SUMMARY PLACEHOLDER */}
          <Grid item xs={12} md={8}>
            <Card sx={{ ...glassCard, height: 450, position: "relative", overflow: "hidden" }}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="h6">Earnings Summary</Typography>
                  <ButtonGroup size="small">
                    <Button variant={period === "weekly" ? "contained" : "outlined"} onClick={() => setPeriod("weekly")}>
                      Weekly
                    </Button>
                    <Button variant={period === "monthly" ? "contained" : "outlined"} onClick={() => setPeriod("monthly")}>
                      Monthly
                    </Button>
                  </ButtonGroup>
                </Box>

                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                  Chart coming soon — analytics are being crafted. For now, earnings are summarized and Top Teachers can be exported by month or custom date range.
                </Typography>

                {/* big overlay placeholder */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    bgcolor: "rgba(0,0,0,0.7)",
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

                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    We’re building advanced analytics for you. Stay tuned 🚀
                  </Typography>
                </Box>
              </CardContent>
            </Card>

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

          {/* TOP TEACHERS + date range + export PDF */}
          <Grid item xs={12} md={4}>
            <Card sx={{ ...glassCard, minHeight: 250 }}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: "bold", color: "#64b5f6" }}>
                    🌟 Top Teachers
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Tooltip title="Export Top Teachers (PDF)">
                      <IconButton size="small" onClick={exportTopTeachersToPDF} sx={{ color: "#fff" }}>
                        <PictureAsPdfIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Date range inputs */}
                <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
                  <TextField
                    label="Start"
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={dateRange.start || ""}
                    onChange={handleDateChange("start")}
                    sx={{ bgcolor: "rgba(255,255,255,0.03)", borderRadius: 1 }}
                  />
                  <TextField
                    label="End"
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={dateRange.end || ""}
                    onChange={handleDateChange("end")}
                    sx={{ bgcolor: "rgba(255,255,255,0.03)", borderRadius: 1 }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      // If either date is missing, reset to current month
                      if (!dateRange.start || !dateRange.end) {
                        const cur = getCurrentMonthRange();
                        setDateRange({ start: cur.start.toISOString().slice(0, 10), end: cur.end.toISOString().slice(0, 10) });
                      } else {
                        computeTopTeachers();
                      }
                    }}
                  >
                    Apply
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      // reset to monthly auto-range
                      setDateRange({ start: null, end: null });
                    }}
                    sx={{ color: "rgba(255,255,255,0.7)" }}
                  >
                    Reset
                  </Button>
                </Box>

                {/* Top teachers list - this is what we export to PDF (ref) */}
                <div ref={topTeachersRef} style={{ padding: 6 }}>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                    Showing: {rangeLabel}
                  </Typography>

                  <List sx={{ mt: 1 }}>
                    {topTeachers.length === 0 && (
                      <Box sx={{ p: 2 }}>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                          No completed sessions in this range.
                        </Typography>
                      </Box>
                    )}

                    {topTeachers.map((t) => (
                      <ListItem
                        key={t.id}
                        sx={{
                          borderRadius: "10px",
                          mb: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          bgcolor: "rgba(255,255,255,0.03)",
                          p: 1,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Avatar src={t.photoURL || ""} alt={t.name || t.id} />
                          <Box>
                            <Typography sx={{ fontWeight: "bold" }}>{t.name}</Typography>
                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                              {t.id}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography sx={{ fontWeight: "bold" }}>₱{(t.earnings || 0).toFixed(2)}</Typography>
                          <RankingBadge rank={t.rank} />
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                </div>
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
                    bgcolor: "rgba(255,255,255,0.06)",
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
                    const startTime = s.startTime?.toDate ? s.startTime.toDate() : s.startTime ? new Date(s.startTime) : null;
                    const endTime = s.endTime?.toDate ? s.endTime.toDate() : s.endTime ? new Date(s.endTime) : null;

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
                          bgcolor: "rgba(255,255,255,0.03)",
                          "&:hover": { bgcolor: "rgba(255,255,255,0.06)" },
                          textAlign: "center",
                        }}
                      >
                        {/* Teacher */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, justifySelf: "start" }}>
                          <Avatar src={teacher.photoURL || ""} alt={teacher.name || s.teacherName || s.teacherId} />
                          <Box sx={{ textAlign: "left" }}>
                            <Typography sx={{ fontWeight: "bold" }}>
                              {teacher.name || s.teacherName || s.teacherId}
                            </Typography>
                            <Chip
                              label={s.classType || "N/A"}
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
                        <Chip label={s.status} size="small" color={statusColors[s.status] || "default"} />

                        {/* Time */}
                        <Box>
                          <Typography sx={{ fontSize: "0.75rem" }}>
                            {startTime ? startTime.toLocaleString() : "-"}
                          </Typography>
                          <Typography sx={{ fontSize: "0.75rem" }}>
                            {endTime ? endTime.toLocaleString() : "-"}
                          </Typography>
                        </Box>

                        {/* Earnings */}
                        <Typography sx={{ fontWeight: "bold", color: "#81c784" }}>
                          ₱{(s.totalEarnings || 0).toFixed(2)}
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
                                border: "1px solid rgba(255,255,255,0.15)",
                                cursor: "pointer",
                                transition: "transform 0.2s ease",
                              }}
                              onClick={() => {
                                setSelectedScreenshot(s.screenshotUrl);
                                setOpenScreenshot(true);
                              }}
                            />
                          ) : (
                            <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.6)" }}>N/A</Typography>
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
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 2, position: "relative" }}>
            <img
              src={selectedScreenshot}
              alt="Screenshot Preview"
              style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "10px", objectFit: "contain" }}
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