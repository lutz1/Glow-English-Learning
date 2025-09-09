import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import TeacherLayout from "../../layout/TeacherLayout";
import { db } from "../../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { format } from "date-fns";

const TeacherEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("date", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEvents(eventsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading)
    return (
      <TeacherLayout>
        <Box sx={{ p: 3, textAlign: "center" }}>
          <CircularProgress />
        </Box>
      </TeacherLayout>
    );

  return (
    <TeacherLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" mb={3} fontWeight="bold" align="center">
          📅 Upcoming Events
        </Typography>

        {events.length === 0 && (
          <Typography variant="body1" align="center">
            No upcoming events.
          </Typography>
        )}

        <List>
          {events.map((event) => (
            <Paper
              key={event.id}
              elevation={3}
              sx={{ mb: 2, p: 2, borderRadius: 2, backgroundColor: "#f5f6fa" }}
            >
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="h6" fontWeight="600">
                      {event.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary">
                        {event.description || "No description provided."}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        Date:{" "}
                        {event.date
                          ? format(event.date.toDate(), "PPP p")
                          : "TBA"}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            </Paper>
          ))}
        </List>
      </Box>
    </TeacherLayout>
  );
};

export default TeacherEventsPage;