import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";

// Pages
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import TeacherDashboard from "./pages/teacher/Dashboard";
import TeacherList from "./pages/admin/TeacherList";
import Payroll from "./pages/admin/Payroll";
import TeacherPerformance from "./pages/admin/Performance";
import StartSession from "./pages/teacher/StartSession";
import TeacherProfile from "./pages/teacher/Profile";
import TeacherSettings from "./pages/teacher/Settings";
import AdminSettings from "./pages/admin/AdminSettings";
import Notifications from "./pages/admin/Notifications";
import EventsPage from "./pages/admin/EventsPage";
import NotAuthorized from "./pages/NotAuthorized";

// ✅ Custom Loading Screen with logo animation
const LoadingScreen = () => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "linear-gradient(135deg, #2c3e50, #34495e, #2c3e50)",
        color: "#fff",
      }}
    >
      {/* Logo with bounce animation */}
      <motion.img
        src={process.env.PUBLIC_URL + "/logo.jpg"} // make sure logo.jpg is in public/
        alt="Logo"
        style={{ width: 100, height: 100, borderRadius: "50%" }}
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />

      {/* Text message */}
      <Typography
        variant="h6"
        sx={{ mt: 2, fontWeight: "bold", color: "#90caf9", textAlign: "center" }}
      >
        Please wait, loading your dashboard...
      </Typography>
    </Box>
  );
};

// 🔒 Private Route wrapper
const PrivateRoute = ({ children, role }) => {
  const { currentUser, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!currentUser) return <Navigate to="/login" replace />;

  if (role && currentUser.role !== role) return <Navigate to="/not-authorized" replace />;

  return children;
};

// Wrapper for login route
const LoginRoute = () => {
  const { currentUser, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (currentUser && currentUser.role) {
    return <Navigate to={`/${currentUser.role}/dashboard`} replace />;
  }

  return <Login />;
};

const App = () => {
  return (
    <AuthProvider>
      <Router basename={process.env.PUBLIC_URL}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/not-authorized" element={<NotAuthorized />} />

          {/* Admin */}
          <Route
            path="/admin/dashboard"
            element={
              <PrivateRoute role="admin">
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <PrivateRoute role="admin">
                <TeacherList />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/payroll"
            element={
              <PrivateRoute role="admin">
                <Payroll />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/performance"
            element={
              <PrivateRoute role="admin">
                <TeacherPerformance />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/events"
            element={
              <PrivateRoute role="admin">
                <EventsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <PrivateRoute role="admin">
                <Notifications />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <PrivateRoute role="admin">
                <AdminSettings />
              </PrivateRoute>
            }
          />

          {/* Teacher */}
          <Route
            path="/teacher/dashboard"
            element={
              <PrivateRoute role="teacher">
                <TeacherDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/start-session"
            element={
              <PrivateRoute role="teacher">
                <StartSession />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/profile"
            element={
              <PrivateRoute role="teacher">
                <TeacherProfile />
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher/settings"
            element={
              <PrivateRoute role="teacher">
                <TeacherSettings />
              </PrivateRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;