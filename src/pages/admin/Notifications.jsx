import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import { LockReset, CheckCircle } from "@mui/icons-material";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import AdminLayout from "../../layout/AdminLayout";
import { useNavigate } from "react-router-dom";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

          // ✅ Auto-delete completed notifications older than 5 days
          if (
            data.status === "completed" &&
            createdAt &&
            createdAt < fiveDaysAgo
          ) {
            try {
              await deleteDoc(doc(db, "notifications", docSnap.id));
              console.log(`Deleted old notification: ${docSnap.id}`);
              continue; // skip pushing to notifList
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

  // ✅ Handle reset action: redirect to TeacherList & mark completed
  const handleResetRedirect = async (notif) => {
    try {
      // Step 1: Mark as in-progress
      await updateDoc(doc(db, "notifications", notif.id), {
        status: "in-progress",
      });

      // Step 2: Redirect to teachers page
      navigate("/admin/teachers", {
        state: { resetTeacherEmail: notif.userEmail, notificationId: notif.id },
      });

      // 👉 Later, after reset email is successfully sent in Teachers page,
      // call updateDoc again to mark as completed:
      // await updateDoc(doc(db, "notifications", notif.id), { status: "completed" });
    } catch (err) {
      console.error("Notification redirect error:", err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Typography
          variant="h4"
          fontWeight="bold"
          gutterBottom
          sx={{ mb: 4, color: "teal" }}
        >
          Admin Notifications
        </Typography>

        <Card sx={{ boxShadow: 3 }}>
          <CardContent>
            <List>
              {notifications.length > 0 ? (
                notifications.map((n, idx) => (
                  <React.Fragment key={n.id || idx}>
                    <ListItem
                      secondaryAction={
                        ["password_reset_request", "password_reset"].includes(
                          n.type
                        ) &&
                        (n.status === "completed" ? (
                          <Tooltip title="Password Reset Completed">
                            <CheckCircle color="success" />
                          </Tooltip>
                        ) : (
                          <Tooltip title="Reset Password">
                            <IconButton
                              color="secondary"
                              onClick={() => handleResetRedirect(n)}
                              disabled={n.status === "in-progress"} // disable while processing
                            >
                              <LockReset />
                            </IconButton>
                          </Tooltip>
                        ))
                      }
                    >
                      <ListItemText
                        primary={n.message}
                        secondary={
                          <>
                            <Typography variant="body2">
                              From: {n.userEmail}
                            </Typography>
                            <Typography variant="body2">
                              Type: {n.type} | Status:{" "}
                              <Chip
                                label={n.status}
                                size="small"
                                color={
                                  n.status === "pending"
                                    ? "warning"
                                    : n.status === "in-progress"
                                    ? "info"
                                    : "success"
                                }
                                sx={{ ml: 1 }}
                              />
                            </Typography>
                            {n.createdAt && (
                              <Typography variant="body2">
                                Date: {n.createdAt.toLocaleString()}
                              </Typography>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                    {idx < notifications.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              ) : (
                <Typography>No notifications.</Typography>
              )}
            </List>
          </CardContent>
        </Card>
      </Box>
    </AdminLayout>
  );
};

export default Notifications;