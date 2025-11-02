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
  TableSortLabel,
} from "@mui/material";

import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

import SchoolIcon from "@mui/icons-material/School";
import PaidIcon from "@mui/icons-material/Paid";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import AdminLayout from "../../layout/AdminLayout";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Recharts for the line chart
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  CartesianGrid,
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
  awaiting_screenshot: "warning",
};

// Status custom order for sorting
const statusOrder = ["ongoing", "awaiting_screenshot", "completed"];

const Dashboard = () => {
  // counts / maps
  const [teacherCount, setTeacherCount] = useState(0);
  const [teachersMap, setTeachersMap] = useState({});

  // payroll / sessions / analytics
  const [totalPayroll, setTotalPayroll] = useState(0);
  const [pendingPayroll, setPendingPayroll] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [earningData, setEarningData] = useState([]); // for chart (array of { label, earnings })
  const [topTeachers, setTopTeachers] = useState([]);

  // loading / UI
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("monthly"); // 'weekly' | 'monthly'
  const [currentTime, setCurrentTime] = useState(new Date());

  // Latest Sessions date range (MUI pickers)
  // If both null => default to today's sessions
  const [latestRange, setLatestRange] = useState({ start: null, end: null });

  // Top Teachers separate dateRange (kept as your original TextFields behavior)
  const [topRange, setTopRange] = useState({ start: null, end: null });

  // screenshot modal
  const [openScreenshot, setOpenScreenshot] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  // Status sorting
  const [statusSortAsc, setStatusSortAsc] = useState(true);

  const topTeachersRef = useRef(null);

  // live clock
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // helpers: today range and normalize ranges
  const getTodayRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
  };

  // --- Add or replace this normalizeRange() helper ---
function normalizeRange(range) {
  const start = range?.start ? new Date(range.start) : new Date();
  const end = range?.end ? new Date(range.end) : new Date();

  // Normalize to local time zone — full day range
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

  // --- Firestore: load teachers ---
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const teachers = snap.docs.filter((d) => d.data()?.role === "teacher").map((d) => ({ id: d.id, ...d.data() }));
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

  // --- Firestore: load sessions (live) ---
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, "sessions"), (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSessions(all.slice(0, 200)); // keep reasonable limit
      setTotalPayroll(all.filter((s) => s.status === "completed").reduce((acc, s) => acc + (s.totalEarnings || 0), 0));
      setPendingPayroll(all.filter((s) => s.status === "pending").reduce((acc, s) => acc + (s.totalEarnings || 0), 0));
      // updateChartData will be invoked by effect below (sessions, period)
      setLoading(false);
    });

    return () => unsub();
    
  }, []);

  // computeTopTeachers uses topRange (TextFields) — kept separate from latestRange
  useEffect(() => {
    computeTopTeachers();
    
  }, [sessions, teachersMap, topRange]);

  // When sessions or period change, aggregate earnings for chart
  useEffect(() => {
    const completed = sessions.filter((s) => (s.status || "").toLowerCase() === "completed");
    // Map keyed by numeric timestamp representing period start (week start or month start)
    const grouped = {};

    completed.forEach((s) => {
      const ts = s.endTime?.toDate ? s.endTime.toDate() : s.endTime ? new Date(s.endTime) : null;
      if (!ts) return;
      if (period === "weekly") {
        // compute week-start (Monday) for clearer weekly buckets
        const day = ts.getDay(); // 0 Sun .. 6 Sat
        // We'll pick Monday as week start: offset = (day + 6) % 7
        const offset = (day + 6) % 7;
        const weekStart = new Date(ts);
        weekStart.setDate(ts.getDate() - offset);
        weekStart.setHours(0, 0, 0, 0);
        const key = weekStart.getTime();
        grouped[key] = (grouped[key] || 0) + (s.totalEarnings || 0);
      } else {
        // monthly
        const monthStart = new Date(ts.getFullYear(), ts.getMonth(), 1, 0, 0, 0, 0);
        const key = monthStart.getTime();
        grouped[key] = (grouped[key] || 0) + (s.totalEarnings || 0);
      }
    });

    // convert to array sorted by key ascending
    const arr = Object.entries(grouped)
      .map(([key, earnings]) => {
        const kNum = Number(key);
        const d = new Date(kNum);
        const label =
          period === "weekly"
            ? `Week of ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
            : `${d.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
        return { key: kNum, label, earnings: Number(earnings.toFixed(2)) };
      })
      .sort((a, b) => a.key - b.key);

    // If there are no data points, generate small placeholders (optional)
    setEarningData(arr);
  }, [sessions, period]);

  // Update filteredSessions whenever sessions, latestRange or status sorting changes
  const [filteredSessions, setFilteredSessions] = useState([]);

// Update filteredSessions whenever sessions, latestRange, or sorting changes
useEffect(() => {
  if (!sessions || sessions.length === 0) {
    setFilteredSessions([]);
    return;
  }

  // --- Normalize range to local midnight boundaries ---
  const normalizeRange = (range) => {
    const start = range.start ? new Date(range.start) : null;
    const end = range.end ? new Date(range.end) : null;

    if (start) start.setHours(0, 0, 0, 0); // local midnight start
    if (end) end.setHours(23, 59, 59, 999); // local end of day

    return { start, end };
  };

  const { start, end } =
    latestRange?.start && latestRange?.end
      ? normalizeRange(latestRange)
      : (() => {
          // Default: today's full range (local)
          const now = new Date();
          const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          return { start: s, end: e };
        })();

  // --- Filter sessions ---
  const filtered = sessions.filter((s) => {
    const statusValue = (s.status || "").trim().toLowerCase();
    const startTs = s.startTime?.toDate
      ? s.startTime.toDate()
      : s.startTime
      ? new Date(s.startTime)
      : null;
    const endTs = s.endTime?.toDate
      ? s.endTime.toDate()
      : s.endTime
      ? new Date(s.endTime)
      : null;

    // Always show ongoing
    if (statusValue === "ongoing") return true;

    if (!startTs && !endTs) return false;

    // Compare using local times
    return (
      (startTs && startTs >= start && startTs <= end) ||
      (endTs && endTs >= start && endTs <= end)
    );
  });

  // --- Sort sessions by status and startTime (latest first) ---
  filtered.sort((a, b) => {
    const aStatus = (a.status || "").trim().toLowerCase();
    const bStatus = (b.status || "").trim().toLowerCase();

    const idxA =
      statusOrder.indexOf(aStatus) >= 0
        ? statusOrder.indexOf(aStatus)
        : statusOrder.length;
    const idxB =
      statusOrder.indexOf(bStatus) >= 0
        ? statusOrder.indexOf(bStatus)
        : statusOrder.length;

    if (idxA !== idxB) {
      return statusSortAsc ? idxA - idxB : idxB - idxA;
    }

    const ta = a.startTime?.toDate
      ? a.startTime.toDate()
      : a.startTime
      ? new Date(a.startTime)
      : null;
    const tb = b.startTime?.toDate
      ? b.startTime.toDate()
      : b.startTime
      ? new Date(b.startTime)
      : null;

    return (tb?.getTime() || 0) - (ta?.getTime() || 0);
  });

  // --- Debug helper (optional) ---
  console.log(
    "📅 Range:",
    start.toString(),
    "→",
    end.toString(),
    "\nFiltered sessions:",
    filtered.map((s) => ({
      id: s.id,
      status: s.status,
      start: s.startTime?.toDate
        ? s.startTime.toDate().toString()
        : s.startTime,
    }))
  );

  setFilteredSessions(filtered);
}, [sessions, latestRange, statusSortAsc, teachersMap]);

  // updateChartData (earnings per teacher per class type) kept for other usages
  const updateChartData = (sessionsArray) => {
    const teacherData = {};
    sessionsArray
      .filter((s) => (s.status || "").toLowerCase() === "completed")
      .forEach((s) => {
        const tName = teachersMap[s.teacherId]?.name || s.teacherName || s.teacherId;
        const classType = s.classType || "Default";
        const earnings = s.totalEarnings || 0;
        if (!teacherData[tName]) teacherData[tName] = { teacherName: tName };
        teacherData[tName][classType] = (teacherData[tName][classType] || 0) + earnings;
      });
    // not used by line chart but kept for potential stacked chart
    setEarningData((prev) => prev); // no-op keep consistent
  };

  // computeTopTeachers
  const computeTopTeachers = () => {
    const { start, end } = (() => {
      if (topRange.start && topRange.end) {
        const s = new Date(topRange.start);
        s.setHours(0, 0, 0, 0);
        const e = new Date(topRange.end);
        e.setHours(23, 59, 59, 999);
        return { start: s, end: e };
      }
      // default: current month
      const now = new Date();
      const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const e = new Date(now.getFullYear(), now.getMonth(), last, 23, 59, 59);
      return { start: s, end: e };
    })();

    const filtered = sessions.filter((s) => {
      if ((s.status || "").toLowerCase() !== "completed") return false;
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
      .slice(0, 10)
      .map(([id, earnings], index) => ({
        id,
        earnings,
        name: teachersMap[id]?.name || "Unknown",
        photoURL: teachersMap[id]?.photoURL || "",
        rank: index + 1,
      }));

    setTopTeachers(ranked);
  };

  // helper: convert image url to base64 for PDF
  const getBase64ImageFromUrl = async (url) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  // Export Top Teachers PDF
  const exportTopTeachersToPDF = async () => {
    if (!topTeachers || topTeachers.length === 0) {
      alert("No top teachers to export.");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("🌟 Top Teachers Report", 14, 20);
    // label for topRange
    let topLabel = "";
    if (topRange.start && topRange.end) {
      const s = new Date(topRange.start);
      const e = new Date(topRange.end);
      topLabel = `${s.toLocaleDateString()} — ${e.toLocaleDateString()}`;
    } else {
      // default to current month
      const now = new Date();
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const e = new Date(now.getFullYear(), now.getMonth(), lastDay);
      topLabel = `${s.toLocaleDateString()} — ${e.toLocaleDateString()}`;
    }
    doc.setFontSize(12);
    doc.text(`Date Range: ${topLabel}`, 14, 28);

    const tableColumn = ["Rank", "Teacher", "Earnings"];
    const tableRows = [];
    const avatars = {};
    for (const t of topTeachers) {
      if (t.photoURL) {
        try {
          avatars[t.id] = await getBase64ImageFromUrl(t.photoURL);
        } catch {
          avatars[t.id] = null;
        }
      }
    }
    topTeachers.forEach((t, index) => {
      const rank = `#${index + 1}`;
      const name = t.name || "Unknown";
      const earnings = `₱${(t.earnings || 0).toFixed(2)}`;
      tableRows.push([rank, name, earnings]);
    });

    doc.autoTable({
      startY: 35,
      head: [tableColumn],
      body: tableRows,
      styles: { fontSize: 11, halign: "center", valign: "middle" },
      headStyles: { fillColor: [100, 181, 246], textColor: 255, fontStyle: "bold" },
      didDrawCell: (data) => {
        const rowIndex = data.row.index;
        const teacher = topTeachers[rowIndex];
        if (!teacher) return;
        // Rank color
        if (data.column.index === 0 && rowIndex >= 0) {
          if (teacher.rank === 1) doc.setTextColor(255, 215, 0);
          else if (teacher.rank === 2) doc.setTextColor(192, 192, 192);
          else if (teacher.rank === 3) doc.setTextColor(205, 127, 50);
          else doc.setTextColor(150);
          doc.setFontSize(12);
          doc.text(`#${teacher.rank}`, data.cell.x + 10, data.cell.y + 6);
          doc.setTextColor(0);
        }
        // Avatar
        if (data.column.index === 1 && rowIndex >= 0) {
          const avatar = avatars[teacher.id];
          if (avatar) {
            const dim = 8;
            const x = data.cell.x + 2;
            const y = data.cell.y + 2;
            doc.addImage(avatar, "JPEG", x, y, dim, dim);
            doc.setFontSize(11);
            doc.text(teacher.name, x + dim + 3, y + dim - 1);
          }
        }
      },
    });

    doc.save("Top_Teachers_Report.pdf");
  };

  // Top Teachers date text fields handler (kept separate)
  const handleTopRangeChange = (field) => (e) => {
    setTopRange((p) => ({ ...p, [field]: e.target.value || null }));
  };

  // Latest pickers update
  const handleLatestStartChange = (date) => {
    setLatestRange((p) => ({ ...p, start: date }));
  };
  const handleLatestEndChange = (date) => {
    setLatestRange((p) => ({ ...p, end: date }));
  };

  // Loading fallback
  if (loading) {
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
  }

  // Ranking badge component
  const RankingBadge = ({ rank }) => {
    if (rank === 1) return <Chip label="🥇 1st" size="small" sx={{ ml: 1, bgcolor: "#FFD700", color: "#000" }} />;
    if (rank === 2) return <Chip label="🥈 2nd" size="small" sx={{ ml: 1, bgcolor: "#C0C0C0", color: "#000" }} />;
    if (rank === 3) return <Chip label="🥉 3rd" size="small" sx={{ ml: 1, bgcolor: "#CD7F32", color: "#000" }} />;
    return <Chip label={`#${rank}`} size="small" sx={{ ml: 1, bgcolor: "rgba(255,255,255,0.06)" }} />;
  };

  // label for Top Teachers card
  const topLabel = (() => {
    if (topRange.start && topRange.end) {
      const s = new Date(topRange.start);
      const e = new Date(topRange.end);
      return `${s.toLocaleDateString()} — ${e.toLocaleDateString()}`;
    }
    // default to current month
    const now = new Date();
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const e = new Date(now.getFullYear(), now.getMonth(), lastDay);
    return `${s.toLocaleDateString()} — ${e.toLocaleDateString()}`;
  })();

  // latestRange label for UI
  const latestLabel = (() => {
    if (latestRange.start && latestRange.end) {
      const s = new Date(latestRange.start);
      const e = new Date(latestRange.end);
      return `${s.toLocaleDateString()} — ${e.toLocaleDateString()}`;
    }
    const today = new Date();
    return `${today.toLocaleDateString()}`;
  })();

  return (
    <AdminLayout>
      <Box sx={{ p: 3, minHeight: "100vh",overflowX: "hidden",background: "linear-gradient(160deg, #2c3e50, #34495e, #2c3e50)", color: "#fff" }}>
        {/* HEADER */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h4" fontWeight="bold">
            Admin Dashboard Overview
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: "bold", color: "#64b5f6" }}>
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </Typography>
        </Box>

        <Divider sx={{ mb: 3, borderColor: "rgba(255,255,255,0.2)" }} />
        <Box sx={{ width: "100%", overflowX: "hidden" }}>
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

          {/* EARNINGS SUMMARY */}
          <Grid item xs={12} md={8}>
            <Card sx={{ ...glassCard, height: 450 }}>
              <CardContent sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="h6">Earnings Summary</Typography>
                  <ButtonGroup size="small">
                    <Button variant={period === "weekly" ? "contained" : "outlined"} onClick={() => setPeriod("weekly")}>Weekly</Button>
                    <Button variant={period === "monthly" ? "contained" : "outlined"} onClick={() => setPeriod("monthly")}>Monthly</Button>
                  </ButtonGroup>
                </Box>

                <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  {/* Summaries */}
                  <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
                    <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                      Total (shown range): ₱{earningData.reduce((acc, d) => acc + (d.earnings || 0), 0).toFixed(2)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                      Showing aggregated {period}
                    </Typography>
                  </Box>

                  {/* Chart area */}
                  <Box sx={{ flex: 1, minHeight: 240 }}>
                    {earningData.length === 0 ? (
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                        <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                          No completed-session earnings for the selected period.
                        </Typography>
                      </Box>
                    ) : (
                      <ResponsiveContainer width="99%" height="100%">
                        <LineChart data={earningData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="label" tick={{ fill: "#fff", fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={60} />
                          <YAxis tick={{ fill: "#fff", fontSize: 12 }} />
                          <ReTooltip formatter={(value) => `₱${Number(value).toFixed(2)}`} labelStyle={{ color: "#fff" }} contentStyle={{ background: "#111", borderColor: "#333" }} />
                          <Line type="monotone" dataKey="earnings" stroke="#64b5f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* TOP TEACHERS + date range + export PDF (kept separate controls) */}
          <Grid item xs={12} md={4}>
            <Card sx={{ ...glassCard, height: 450 }}>
              <CardContent sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: "bold", color: "#64b5f6" }}> 🌟 Top Teachers </Typography>
                  <Tooltip title="Export Top Teachers (PDF)">
                    <IconButton size="small" onClick={exportTopTeachersToPDF} sx={{ color: "#fff" }}>
                      <PictureAsPdfIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Top Teachers Date range (kept as text fields) */}
                <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
                  <TextField label="Start" type="date" size="small" InputLabelProps={{ shrink: true }} value={topRange.start || ""} onChange={handleTopRangeChange("start")} sx={{ bgcolor: "rgba(255,255,255,0.03)", borderRadius: 1 }} />
                  <TextField label="End" type="date" size="small" InputLabelProps={{ shrink: true }} value={topRange.end || ""} onChange={handleTopRangeChange("end")} sx={{ bgcolor: "rgba(255,255,255,0.03)", borderRadius: 1 }} />
                  <Button size="small" variant="outlined" onClick={() => {
                    if (!topRange.start || !topRange.end) {
                      const now = new Date();
                      const s = new Date(now.getFullYear(), now.getMonth(), 1);
                      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                      const e = new Date(now.getFullYear(), now.getMonth(), last);
                      setTopRange({ start: s.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10) });
                    } else {
                      computeTopTeachers();
                    }
                  }}>Apply</Button>
                  <Button size="small" variant="text" onClick={() => setTopRange({ start: null, end: null })} sx={{ color: "rgba(255,255,255,0.7)" }}>Reset</Button>
                </Box>

                <Box ref={topTeachersRef} sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}> Showing: {topLabel} </Typography>
                  <List sx={{ mt: 1 }}>
                    {topTeachers.length === 0 && <Box sx={{ p: 2 }}><Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}> No completed sessions in this range. </Typography></Box>}
                    {topTeachers.map((t) => (
                      <ListItem key={t.id} sx={{ borderRadius: "10px", mb: 1, display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "rgba(255,255,255,0.03)", p: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Avatar src={t.photoURL || ""} alt={t.name || "Unknown"} />
                          <Typography sx={{ fontWeight: "bold" }}>{t.name}</Typography>
                        </Box>
                        <RankingBadge rank={t.rank} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* LATEST SESSIONS (with MUI date pickers and sortable status) */}
          <Grid item xs={12}>
            <Card sx={glassCard}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap" }}>
                  <Typography variant="h6" sx={{ fontWeight: "bold", color: "#64b5f6" }}>
                    📅 Latest Sessions
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Start Date"
                        value={latestRange.start}
                        onChange={handleLatestStartChange}
                        slotProps={{ textField: { size: "small", sx: { bgcolor: "#fff", borderRadius: 1, minWidth: 110 } } }}
                      />
                      <DatePicker
                        label="End Date"
                        value={latestRange.end}
                        onChange={handleLatestEndChange}
                        slotProps={{ textField: { size: "small", sx: { bgcolor: "#fff", borderRadius: 1, minWidth: 110 } } }}
                      />
                    </LocalizationProvider>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setLatestRange({ start: null, end: null });
                      }}
                      sx={{ bgcolor: "rgba(255,255,255,0.1)", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}
                    >
                      Reset
                    </Button>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                      Showing: {latestLabel}
                    </Typography>
                  </Box>
                </Box>

                {/* Responsive Header Row */}
                <Box
                  sx={{
                    display: { xs: "none", sm: "grid" },
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
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <TableSortLabel active direction={statusSortAsc ? "asc" : "desc"} onClick={() => setStatusSortAsc((s) => !s)}>
                      📌 Status
                    </TableSortLabel>
                  </Box>
                  <Typography>⏰ Time</Typography>
                  <Typography>💰 Earnings</Typography>
                  <Typography>🖼 Screenshot</Typography>
                </Box>

                {/* Mobile Header Row */}
                <Box
                  sx={{
                    display: { xs: "flex", sm: "none" },
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 1,
                    borderRadius: "10px",
                    mb: 1,
                    fontWeight: "bold",
                    bgcolor: "rgba(255,255,255,0.06)",
                  }}
                >
                  <Typography sx={{ fontSize: "0.95rem" }}>Session</Typography>
                  <TableSortLabel
                    active
                    direction={statusSortAsc ? "asc" : "desc"}
                    onClick={() => setStatusSortAsc((s) => !s)}
                    sx={{ fontSize: "0.95rem" }}
                  >
                    Status
                  </TableSortLabel>
                  <Typography sx={{ fontSize: "0.95rem" }}>Earnings</Typography>
                </Box>

                {/* Responsive Session List */}
                <List sx={{ maxHeight: 400, overflow: "auto" }}>
                  {filteredSessions.length === 0 && (
                    <Box sx={{ p: 2 }}>
                      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                        {latestRange.start && latestRange.end
                          ? `No sessions found for ${latestLabel}`
                          : `No sessions for today (${new Date().toLocaleDateString()}).`}
                      </Typography>
                    </Box>
                  )}

                  {filteredSessions.map((s) => {
                    const teacher = teachersMap[s.teacherId] || {};
                    const startTime = s.startTime?.toDate ? s.startTime.toDate() : s.startTime ? new Date(s.startTime) : null;
                    const endTime = s.endTime?.toDate ? s.endTime.toDate() : s.endTime ? new Date(s.endTime) : null;

                    return (
                      <ListItem
                        key={s.id}
                        sx={{
                          display: { xs: "flex", sm: "grid" },
                          flexDirection: { xs: "column", sm: "unset" },
                          gridTemplateColumns: { sm: "2fr 1fr 2fr 1fr 1fr" },
                          alignItems: "center",
                          p: 1.5,
                          mb: 1,
                          borderRadius: "12px",
                          bgcolor: "rgba(255,255,255,0.03)",
                          "&:hover": { bgcolor: "rgba(255,255,255,0.06)" },
                          textAlign: "center",
                          width: "100%",
                        }}
                      >
                        {/* Teacher */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            justifySelf: "start",
                            width: { xs: "100%", sm: "auto" },
                            mb: { xs: 1, sm: 0 },
                          }}
                        >
                          <Avatar src={teacher.photoURL || ""} alt={teacher.name || s.teacherName || s.teacherId} />
                          <Box sx={{ textAlign: "left" }}>
                            <Typography sx={{ fontWeight: "bold", fontSize: { xs: "1rem", sm: "inherit" } }}>
                              {teacher.name || s.teacherName || s.teacherId}
                            </Typography>
                            <Chip
                              label={s.classType || "N/A"}
                              size="small"
                              sx={{
                                mt: 0.5,
                                fontWeight: "bold",
                                ...(classTypeColors[s.classType] || classTypeColors.Default),
                                fontSize: { xs: "0.75rem", sm: "inherit" },
                              }}
                            />
                          </Box>
                        </Box>

                        {/* Status */}
                        <Chip
                          label={s.status}
                          size="small"
                          color={statusColors[s.status] || "default"}
                          sx={{ mb: { xs: 1, sm: 0 }, fontSize: { xs: "0.75rem", sm: "inherit" } }}
                        />

                        {/* Time */}
                        <Box sx={{ display: { xs: "none", sm: "block" } }}>
                          <Typography sx={{ fontSize: "0.75rem" }}>
                            {startTime ? startTime.toLocaleString() : "-"}
                          </Typography>
                          <Typography sx={{ fontSize: "0.75rem" }}>
                            {endTime ? endTime.toLocaleString() : "-"}
                          </Typography>
                        </Box>
                        {/* Mobile Time */}
                        <Box sx={{ display: { xs: "flex", sm: "none" }, flexDirection: "row", gap: 1, width: "100%", justifyContent: "space-between", mb: 1 }}>
                          <Typography sx={{ fontSize: "0.75rem" }}>
                            {startTime ? startTime.toLocaleTimeString() : "-"}
                          </Typography>
                          <Typography sx={{ fontSize: "0.75rem" }}>
                            {endTime ? endTime.toLocaleTimeString() : "-"}
                          </Typography>
                        </Box>

                        {/* Earnings */}
                        <Typography
                          sx={{
                            fontWeight: "bold",
                            color: "#81c784",
                            fontSize: { xs: "1rem", sm: "inherit" },
                            mb: { xs: 1, sm: 0 },
                            width: { xs: "100%", sm: "auto" },
                            textAlign: { xs: "left", sm: "center" },
                          }}
                        >
                          ₱{(s.totalEarnings || 0).toFixed(2)}
                        </Typography>

                        {/* Screenshot */}
                        <Box
                          sx={{
                            display: { xs: "none", sm: "block" },
                            width: "100%",
                            textAlign: "center",
                          }}
                        >
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
                        {/* Mobile Screenshot */}
                        <Box
                          sx={{
                            display: { xs: "flex", sm: "none" },
                            width: "100%",
                            justifyContent: "flex-start",
                            alignItems: "center",
                            mt: 1,
                          }}
                        >
                          {s.screenshotUrl ? (
                            <img
                              src={s.screenshotUrl}
                              alt="Session Screenshot"
                              style={{
                                width: 48,
                                height: 32,
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
      </Box>

      {/* Screenshot Lightbox */}
      {selectedScreenshot && (
        <Dialog open={openScreenshot} onClose={() => setOpenScreenshot(false)} maxWidth="md" fullWidth PaperProps={{ sx: { background: "rgba(0,0,0,0.9)", boxShadow: "none" } }}>
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 2, position: "relative" }}>
            <img src={selectedScreenshot} alt="Screenshot Preview" style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "10px", objectFit: "contain" }} />
            <Box sx={{ position: "absolute", top: 10, right: 10, cursor: "pointer", color: "#fff", fontWeight: "bold", fontSize: "1.2rem", p: 1 }} onClick={() => setOpenScreenshot(false)}> ✕ </Box>
          </Box>
        </Dialog>
      )}
    </AdminLayout>
  );
};

export default Dashboard; 