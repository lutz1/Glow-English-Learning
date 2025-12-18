import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Tooltip,
} from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { collection, addDoc, onSnapshot, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "../../firebase";
import EventIcon from "@mui/icons-material/Event";
import SchoolIcon from "@mui/icons-material/School";
import WorkIcon from "@mui/icons-material/Work";

const eventTypeColors = {
  Meeting: "#3498db",
  Class: "#2ecc71",
  Holiday: "#e74c3c",
  Other: "#9b59b6",
};

const eventTypeIcons = {
  Meeting: <EventIcon sx={{ fontSize: "16px", verticalAlign: "middle", mr: 0.5 }} />,
  Class: <SchoolIcon sx={{ fontSize: "16px", verticalAlign: "middle", mr: 0.5 }} />,
  Holiday: <WorkIcon sx={{ fontSize: "16px", verticalAlign: "middle", mr: 0.5 }} />,
  Other: <EventIcon sx={{ fontSize: "16px", verticalAlign: "middle", mr: 0.5 }} />,
};

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", description: "", start: "", end: "", type: "Other" });

  // Fetch events
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "events"), (snapshot) => {
      const eventsData = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const start = data.start && data.start.toDate ? data.start.toDate() : new Date(data.start);
        const end =
          data.end && data.end.toDate ? data.end.toDate() : data.end ? new Date(data.end) : start;
        return {
          id: docSnap.id,
          title: data.title,
          description: data.description || "",
          start,
          end,
          type: data.type || "Other",
        };
      });
      setEvents(eventsData);
    });
    return () => unsubscribe();
  }, []);

  // Add new event
  const handleAddEvent = async () => {
    const trimmedTitle = newEvent.title.trim();
    if (!trimmedTitle || !newEvent.start) return;

    const startDate = new Date(newEvent.start);
    const parsedEnd = newEvent.end ? new Date(newEvent.end) : startDate;
    if (Number.isNaN(startDate.getTime())) return;
    const endDate = Number.isNaN(parsedEnd.getTime()) ? startDate : parsedEnd;
    const normalizedEnd = endDate < startDate ? startDate : endDate;

    try {
      await addDoc(collection(db, "events"), {
        title: trimmedTitle,
        description: newEvent.description.trim(),
        start: Timestamp.fromDate(startDate),
        end: Timestamp.fromDate(normalizedEnd),
        type: newEvent.type || "Other",
      });
      setNewEvent({ title: "", description: "", start: "", end: "", type: "Other" });
      setOpenDialog(false);
    } catch (error) {
      console.error("Failed to add event", error);
    }
  };

  // Delete event
  const handleEventClick = async (clickInfo) => {
    if (window.confirm(`Are you sure you want to delete the event "${clickInfo.event.title}"?`)) {
      await deleteDoc(doc(db, "events", clickInfo.event.id));
    }
  };

  // Date selection
  const handleDateSelect = (selectInfo) => {
    setNewEvent((prev) => ({
      ...prev,
      start: selectInfo.startStr,
      end: selectInfo.endStr || selectInfo.startStr,
    }));
    setOpenDialog(true);
  };

  // Custom event rendering
  const renderEventContent = (eventInfo) => {
    const type = eventInfo.event.extendedProps.type || "Other";
    const Icon = eventTypeIcons[type];
    const startTime = eventInfo.event.start
      ? eventInfo.event.start.toLocaleString([], { dateStyle: "short", timeStyle: "short" })
      : "";
    const endTime = eventInfo.event.end
      ? eventInfo.event.end.toLocaleString([], { dateStyle: "short", timeStyle: "short" })
      : "";

    return (
      <Tooltip title={`${startTime} - ${endTime}`}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.9rem" }}>
          {Icon}
          <span>{eventInfo.event.title}</span>
        </Box>
      </Tooltip>
    );
  };

  return (
    <Box sx={{ display: "flex" }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, minHeight: "100vh", background: "linear-gradient(160deg, #2c3e50, #34495e, #2c3e50)" }}>
        <Topbar />
        <Box sx={{ p: 3, mt: 8 }}>
          <Box
            sx={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(18px)",
              borderRadius: "18px",
              boxShadow: "0 12px 28px rgba(0,0,0,0.4)",
              p: 3,
              color: "#fff",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 3,
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#64b5f6" }}>
                📅 Events Calendar
              </Typography>
              <Button variant="contained" startIcon={<EventIcon />} onClick={() => setOpenDialog(true)} sx={{ bgcolor: "#64b5f6", "&:hover": { bgcolor: "#90caf9" } }}>
                Add Event
              </Button>
            </Box>

            {/* Calendar Wrapper */}
            <Box sx={{ position: "relative", borderRadius: 2, overflow: "hidden" }}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
              }}
              editable
              selectable
              selectMirror={true}
              dayMaxEvents={true}
              select={handleDateSelect}
              events={events.map((evt) => ({
                ...evt,
                id: evt.id,
                backgroundColor: eventTypeColors[evt.type] || eventTypeColors["Other"],
                borderColor: eventTypeColors[evt.type] || eventTypeColors["Other"],
              }))}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
              height="auto"
              slotMinTime="08:00:00"
              slotMaxTime="20:00:00"
            />

            </Box>
          </Box>

          {/* Add Event Dialog */}
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { background: "rgba(20,30,48,0.95)", color: "#fff", borderRadius: 3, border: "1px solid rgba(255,255,255,0.1)" } }}>
            <DialogTitle sx={{ fontWeight: 700, fontSize: "1.3rem", color: "#64b5f6" }}>Add New Event</DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 2, borderColor: "rgba(255,255,255,0.1)" }}>
              <TextField
                label="Event Title"
                placeholder="e.g., Staff Meeting, Holiday Break"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                fullWidth
                variant="outlined"
                size="medium"
                InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
                InputProps={{ style: { color: "#fff" } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                    "&:hover fieldset": { borderColor: "#64b5f6" },
                    "&.Mui-focused fieldset": { borderColor: "#64b5f6" },
                  },
                }}
              />
              <TextField
                label="Description"
                placeholder="Provide details about this event..."
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                fullWidth
                variant="outlined"
                multiline
                rows={3}
                size="medium"
                InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
                InputProps={{ style: { color: "#fff" } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                    "&:hover fieldset": { borderColor: "#64b5f6" },
                    "&.Mui-focused fieldset": { borderColor: "#64b5f6" },
                  },
                }}
              />
              <TextField
                label="Start Date & Time"
                type="datetime-local"
                InputLabelProps={{ shrink: true, style: { color: "rgba(255,255,255,0.7)" } }}
                value={newEvent.start}
                onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                fullWidth
                variant="outlined"
                InputProps={{ style: { color: "#fff" } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                    "&:hover fieldset": { borderColor: "#64b5f6" },
                    "&.Mui-focused fieldset": { borderColor: "#64b5f6" },
                  },
                }}
              />
              <TextField
                label="End Date & Time"
                type="datetime-local"
                InputLabelProps={{ shrink: true, style: { color: "rgba(255,255,255,0.7)" } }}
                value={newEvent.end}
                onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                fullWidth
                variant="outlined"
                InputProps={{ style: { color: "#fff" } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                    "&:hover fieldset": { borderColor: "#64b5f6" },
                    "&.Mui-focused fieldset": { borderColor: "#64b5f6" },
                  },
                }}
              />
              <FormControl fullWidth sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                  "&:hover fieldset": { borderColor: "#64b5f6" },
                  "&.Mui-focused fieldset": { borderColor: "#64b5f6" },
                },
                "& .MuiInputLabel-root": { color: "rgba(255,255,255,0.7)" },
              }}>
                <InputLabel sx={{ color: "rgba(255,255,255,0.7)" }}>Event Type</InputLabel>
                <Select
                  value={newEvent.type}
                  label="Event Type"
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                  sx={{ color: "#fff" }}
                >
                  <MenuItem value="Meeting">Meeting</MenuItem>
                  <MenuItem value="Class">Class</MenuItem>
                  <MenuItem value="Holiday">Holiday</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions sx={{ p: 2, gap: 1, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <Button onClick={() => setOpenDialog(false)} variant="outlined" sx={{ color: "#e57373", borderColor: "#e57373", "&:hover": { backgroundColor: "rgba(229,115,115,0.1)" } }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleAddEvent} sx={{ bgcolor: "#64b5f6", "&:hover": { bgcolor: "#90caf9" } }}>
                Add Event
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
};

export default EventsPage;