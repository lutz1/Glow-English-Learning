import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Avatar,
  Divider,
} from "@mui/material";
import {
  LockReset,
  CheckCircle,
  NotificationsActive,
} from "@mui/icons-material";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import AdminLayout from "../../layout/AdminLayout";
import Swal from "sweetalert2";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const notifQuery = query(
      collection(db, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      notifQuery,
      async (snapshot) => {
        const now = new Date();
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(now.getDate() - 5);

        const notifList = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const createdAt = data.createdAt ? data.createdAt.toDate() : null;

          // ✅ Auto-delete old completed notifications
          if (
            data.status === "completed" &&
            createdAt &&
            createdAt < fiveDaysAgo
          ) {
            try {
              await deleteDoc(doc(db, "notifications", docSnap.id));
              continue;
            } catch (err) {
              console.error("Error deleting old notification:", err);
            }
          }

          notifList.push({
            id: docSnap.id,
            message: data.teacherEmail
              ? `Password reset requested for ${data.teacherEmail}`
              : data.message || "",
            type: data.type || "general",
            userEmail: data.teacherEmail || data.userEmail || "Unknown",
            status: data.status || "pending",
            createdAt,
          });
        }

        setNotifications(notifList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching notifications:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ✅ Send reset password email
  const handleResetPassword = async (notif) => {
    try {
      await updateDoc(doc(db, "notifications", notif.id), {
        status: "in-progress",
      });

      await sendPasswordResetEmail(auth, notif.userEmail);

      await updateDoc(doc(db, "notifications", notif.id), {
        status: "completed",
      });

      Swal.fire({
        background: "rgba(20, 20, 40, 0.9)",
        color: "#fff",
        imageUrl: require("../../assets/logo.jpg"),
        imageWidth: 70,
        imageHeight: 70,
        title: "Password Reset Email Sent",
        text: `Email successfully sent to ${notif.userEmail}`,
        confirmButtonColor: "#2575fc",
        backdrop: `rgba(0,0,0,0.6)`,
      });
    } catch (err) {
      console.error("Error sending reset email:", err);
      await updateDoc(doc(db, "notifications", notif.id), {
        status: "failed",
      });

      Swal.fire({
        background: "rgba(20, 20, 40, 0.9)",
        color: "#fff",
        imageUrl: require("../../assets/logo.jpg"),
        imageWidth: 70,
        imageHeight: 70,
        title: "Error",
        text: err.message,
        confirmButtonColor: "#d32f2f",
        backdrop: `rgba(0,0,0,0.6)`,
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress sx={{ color: "#fff" }} />
      </Box>
    );
  }

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        {/* Page Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 4,
            p: 3,
            borderRadius: 4,
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "white",
          }}
        >
          <NotificationsActive sx={{ fontSize: 40, mr: 2, color: "#00e5ff" }} />
          <Typography variant="h4" fontWeight="bold">
            Notifications Center
          </Typography>
        </Box>

        {/* Notification Cards */}
        <Grid container spacing={3}>
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <Grid item xs={12} md={6} key={n.id}>
                <Card
                  sx={{
                    borderRadius: 4,
                    background: "rgba(255, 255, 255, 0.07)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-6px)",
                      boxShadow: "0 16px 50px rgba(0,0,0,0.6)",
                    },
                  }}
                >
                  <CardContent>
                    {/* Top Section */}
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor:
                            n.status === "pending"
                              ? "#ff9800"
                              : n.status === "in-progress"
                              ? "#29b6f6"
                              : n.status === "completed"
                              ? "#66bb6a"
                              : "#ef5350",
                          mr: 2,
                          boxShadow: "0 0 15px rgba(0,0,0,0.4)",
                        }}
                      >
                        <LockReset />
                      </Avatar>
                      <Box>
                        <Typography
                          variant="subtitle1"
                          fontWeight="bold"
                          sx={{ color: "white" }}
                        >
                          {n.message}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "rgba(255,255,255,0.7)" }}
                        >
                          {n.createdAt?.toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider
                      sx={{ my: 2, borderColor: "rgba(255,255,255,0.2)" }}
                    />

                    {/* Details */}
                    <Typography variant="body2" sx={{ color: "white" }}>
                      <strong>Email:</strong> {n.userEmail}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ mt: 1, color: "rgba(255,255,255,0.85)" }}
                    >
                      <strong>Type:</strong> {n.type}
                    </Typography>

                    {/* Status + Action */}
                    <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
                      <Chip
                        label={n.status}
                        color={
                          n.status === "pending"
                            ? "warning"
                            : n.status === "in-progress"
                            ? "info"
                            : n.status === "completed"
                            ? "success"
                            : "error"
                        }
                        sx={{
                          fontWeight: "bold",
                          mr: 2,
                          px: 1,
                          backdropFilter: "blur(6px)",
                        }}
                      />

                      {["password_reset_request", "password_reset"].includes(
                        n.type
                      ) &&
                        (n.status === "completed" ? (
                          <Tooltip title="Password Reset Completed">
                            <CheckCircle sx={{ color: "#4caf50" }} />
                          </Tooltip>
                        ) : (
                          <Tooltip title="Send Password Reset Email">
                            <IconButton
                              onClick={() => handleResetPassword(n)}
                              disabled={n.status === "in-progress"}
                              sx={{
                                color: "white",
                                background: "linear-gradient(45deg,#2575fc,#6a11cb)",
                                "&:hover": {
                                  background:
                                    "linear-gradient(45deg,#6a11cb,#2575fc)",
                                },
                              }}
                            >
                              <LockReset />
                            </IconButton>
                          </Tooltip>
                        ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Typography sx={{ color: "white", ml: 2 }}>
              No notifications found.
            </Typography>
          )}
        </Grid>
      </Box>
    </AdminLayout>
  );
};

export default Notifications;