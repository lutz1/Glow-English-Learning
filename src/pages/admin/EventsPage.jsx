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
import { collection, addDoc, onSnapshot, deleteDoc, doc } from "firebase/firestore";
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
  const [newEvent, setNewEvent] = useState({ title: "", start: "", end: "", type: "Other" });

  // Fetch events from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "events"), (snapshot) => {
      const eventsData = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const start = data.start && data.start.toDate ? data.start.toDate() : new Date(data.start);
        const end = data.end && data.end.toDate ? data.end.toDate() : data.end ? new Date(data.end) : start;
        return {
          id: docSnap.id,
          title: data.title,
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
    if (!newEvent.title || !newEvent.start || !newEvent.end) return;
    await addDoc(collection(db, "events"), newEvent);
    setNewEvent({ title: "", start: "", end: "", type: "Other" });
    setOpenDialog(false);
  };

  // Delete event
  const handleEventClick = async (clickInfo) => {
    if (window.confirm(`Are you sure you want to delete the event "${clickInfo.event.title}"?`)) {
      await deleteDoc(doc(db, "events", clickInfo.event.id));
    }
  };

  // Date selection for new event
  const handleDateSelect = (selectInfo) => {
    setNewEvent({
      ...newEvent,
      start: selectInfo.startStr,
      end: selectInfo.endStr || selectInfo.startStr,
    });
    setOpenDialog(true);
  };

  // Custom event rendering to include icons + tooltip
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

      <Box sx={{ flexGrow: 1, minHeight: "100vh", bgcolor: "#f4f6f8" }}>
        <Topbar />
        <Box sx={{ p: 3, mt: 8 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
            📅 Events Calendar
          </Typography>

          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
            }}
            editable={true}
            selectable={true}
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

          {/* Add Event Dialog */}
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
            <DialogTitle>Add New Event</DialogTitle>
            <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
              <TextField
                label="Event Title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                fullWidth
              />
              <TextField
                label="Start Date & Time"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={newEvent.start}
                onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                fullWidth
              />
              <TextField
                label="End Date & Time"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={newEvent.end}
                onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={newEvent.type}
                  label="Event Type"
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                >
                  <MenuItem value="Meeting">Meeting</MenuItem>
                  <MenuItem value="Class">Class</MenuItem>
                  <MenuItem value="Holiday">Holiday</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleAddEvent}>
                Add
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
};

export default EventsPage;