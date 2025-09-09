import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Box, CircularProgress } from "@mui/material";

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
import EventsPage from "./pages/admin/EventsPage"; // ✅ Admin Events
import NotAuthorized from "./pages/NotAuthorized";

// 🔒 Private Route wrapper
const PrivateRoute = ({ children, role }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #a29bfe, #74b9ff, #81ecec)",
        }}
      >
        <CircularProgress sx={{ color: "#fff" }} />
      </Box>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;

  if (role && currentUser.role !== role) return <Navigate to="/not-authorized" replace />;

  return children;
};

// Wrapper for login route
const LoginRoute = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #a29bfe, #74b9ff, #81ecec)",
        }}
      >
        <CircularProgress sx={{ color: "#fff" }} />
      </Box>
    );
  }

  if (currentUser && currentUser.role) {
    return <Navigate to={`/${currentUser.role}/dashboard`} replace />;
  }

  return <Login />;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
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
            path="/admin/events" // ✅ Admin Events route
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