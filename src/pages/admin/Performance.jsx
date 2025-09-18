// src/pages/admin/TeacherPerformance.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  Chip,
} from "@mui/material";
import { collection, getDoc, getDocs, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { auth } from "../../firebase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import AdminLayout from "../../layout/AdminLayout";

// Glass style
const glassCard = {
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(12px)",
  borderRadius: "14px",
  boxShadow: "0 12px 24px rgba(0,0,0,0.45)",
  color: "#fff",
};

// Color palette
const COLORS = [
  "#64b5f6",
  "#81c784",
  "#ffb74d",
  "#e57373",
  "#ba68c8",
  "#4dd0e1",
  "#f06292",
  "#aed581",
];

const TeacherPerformance = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkedRole, setCheckedRole] = useState(false);

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setCheckedRole(true);
          setIsAdmin(false);
          return;
        }

        // 1. Check role in users collection
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
          setCheckedRole(true);
          setIsAdmin(false);
          return;
        }

        const role = userDoc.data().role;
        if (role !== "admin") {
          setCheckedRole(true);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(true);
        setCheckedRole(true);

        // 2. Load teacher details
        const teachersSnap = await getDocs(collection(db, "teachers"));
        const teacherMap = {};
        teachersSnap.forEach((docSnap) => {
          const t = docSnap.data();
          teacherMap[docSnap.id] = {
            id: docSnap.id,
            name: t.name || "Unnamed Teacher",
            email: t.email || "N/A",
            avatar: t.photoURL || "",
            sessions: 0,
          };
        });

        // 3. Load sessions
        const sessionsSnap = await getDocs(collection(db, "sessions"));
        sessionsSnap.forEach((docSnap) => {
          const s = docSnap.data();
          const teacherId = s.teacherId;
          if (!teacherId) return;

          if (!teacherMap[teacherId]) {
            teacherMap[teacherId] = {
              id: teacherId,
              name: s.teacherName || "Unnamed Teacher",
              email: s.teacherEmail || "N/A",
              avatar: s.teacherAvatar || "",
              sessions: 0,
            };
          }

          teacherMap[teacherId].sessions += 1;
        });

        // 4. Sort by sessions
        const sorted = Object.values(teacherMap).sort(
          (a, b) => b.sessions - a.sessions
        );
        setTeachers(sorted);
      } catch (err) {
        console.error("Error fetching teacher performance:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndFetch();
  }, []);

  if (!checkedRole) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background:
            "linear-gradient(160deg, #2c3e50, #34495e, #2c3e50)",
        }}
      >
        <CircularProgress sx={{ color: "#64b5f6" }} />
      </Box>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout>
        <Box
          sx={{
            p: 3,
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(160deg, #2c3e50, #34495e, #2c3e50)",
            color: "#fff",
          }}
        >
          <Typography variant="h5" sx={{ textAlign: "center" }}>
            🚫 You don’t have permission to view this page.  
            <br />
            Admin access required.
          </Typography>
        </Box>
      </AdminLayout>
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background:
            "linear-gradient(160deg, #2c3e50, #34495e, #2c3e50)",
        }}
      >
        <CircularProgress sx={{ color: "#64b5f6" }} />
      </Box>
    );
  }

  return (
    <AdminLayout>
      <Box
        sx={{
          p: 3,
          minHeight: "100vh",
          background:
            "linear-gradient(160deg, #2c3e50, #34495e, #2c3e50)",
          color: "#fff",
        }}
      >
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
          📊 Teacher Performance
        </Typography>

        <Grid container spacing={3}>
          {/* Leaderboard */}
          <Grid item xs={12} md={4}>
            <Card sx={{ ...glassCard, height: 500 }}>
              <CardContent>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    color: "#64b5f6",
                    mb: 2,
                  }}
                >
                  🏆 Top Teachers
                </Typography>
                <List>
                  {teachers.slice(0, 8).map((t, i) => (
                    <ListItem
                      key={t.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        bgcolor: "rgba(255,255,255,0.05)",
                        mb: 1,
                        borderRadius: "10px",
                        p: 1.2,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                        }}
                      >
                        <Avatar src={t.avatar} alt={t.name}>
                          {!t.avatar && (t.name?.[0] || "T")}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: "bold" }}>
                            {t.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "rgba(255,255,255,0.6)" }}
                          >
                            {t.email}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={`${t.sessions} Sessions`}
                        size="small"
                        sx={{
                          bgcolor: "#64b5f6",
                          color: "#000",
                          fontWeight: "bold",
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Bar Chart */}
          <Grid item xs={12} md={8}>
            <Card sx={{ ...glassCard, height: 500 }}>
              <CardContent>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    color: "#64b5f6",
                    mb: 2,
                  }}
                >
                  📈 Sessions per Teacher
                </Typography>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart
                    data={teachers.slice(0, 12)}
                    margin={{ top: 10, right: 20, left: 0, bottom: 50 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#fff", fontSize: 12 }}
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fill: "#fff", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#111",
                        border: "1px solid #333",
                        color: "#fff",
                      }}
                      formatter={(v) => [`${v} Sessions`, "Sessions"]}
                    />
                    <Legend />
                    <Bar dataKey="sessions">
                      {teachers.slice(0, 12).map((_, i) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={COLORS[i % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </AdminLayout>
  );
};

export default TeacherPerformance;