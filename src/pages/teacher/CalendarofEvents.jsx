import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Stack,
  Tooltip,
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import SchoolIcon from "@mui/icons-material/School";
import WorkIcon from "@mui/icons-material/Work";
import EventIcon from "@mui/icons-material/Event";
import TeacherSidebar from "../../components/TeacherSidebar";
import TeacherTopbar from "../../components/TeacherTopbar";
import bg from "../../assets/christmas.gif";

const eventTypeColors = {
  Meeting: "#3498db",
  Class: "#2ecc71",
  Holiday: "#e74c3c",
  Other: "#9b59b6",
};

const eventTypeIcons = {
  Meeting: <EventIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />,
  Class: <SchoolIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />,
  Holiday: <WorkIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />,
  Other: <EventIcon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />,
};

const CalendarofEvents = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "events"), (snapshot) => {
      const eventsData = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const start = data.start && data.start.toDate ? data.start.toDate() : new Date(data.start);
        const end = data.end && data.end.toDate ? data.end.toDate() : data.end ? new Date(data.end) : start;
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

  const renderEventContent = (eventInfo) => {
    const type = eventInfo.event.extendedProps.type || "Other";
    const description = eventInfo.event.extendedProps.description || "";
    const Icon = eventTypeIcons[type];
    const startTime = eventInfo.event.start
      ? eventInfo.event.start.toLocaleString([], { dateStyle: "short", timeStyle: "short" })
      : "";
    const endTime = eventInfo.event.end
      ? eventInfo.event.end.toLocaleString([], { dateStyle: "short", timeStyle: "short" })
      : "";

    const tooltipTitle = description 
      ? `${startTime} - ${endTime}\n\n${description}` 
      : `${startTime} - ${endTime}`;

    return (
      <Tooltip title={tooltipTitle} arrow placement="top">
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: "0.9rem" }}>
          {Icon}
          <span>{eventInfo.event.title}</span>
        </Box>
      </Tooltip>
    );
  };

  const upcomingEvents = [...events]
    .filter((evt) => evt.start)
    .sort((a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0))
    .slice(0, 5);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Background GIF */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `url(${bg}) center/cover no-repeat`,
          zIndex: -2,
        }}
      />
      {/* Frosted overlay */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: -1,
        }}
      />
      <TeacherSidebar open={sidebarOpen} onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${sidebarOpen ? 240 : 60}px)` },
          transition: "width 0.3s ease",
          minHeight: "100vh",
        }}
      >
        <TeacherTopbar open={sidebarOpen} onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        <Box sx={{ flexGrow: 1, mt: 2, overflowY: "auto", px: { xs: 2, sm: 3, md: 3 }, pt: "64px" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              mb: 2,
              flexWrap: "wrap",
            }}
          >
            <EventAvailableRoundedIcon sx={{ color: "#fff", fontSize: 28 }} />
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ color: "#fff" }}>
                Calendar of Events
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                View events and announcements added by admin.
              </Typography>
            </Box>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2.5 },
              borderRadius: 3,
              background: "rgba(136, 134, 134, 0.44)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              mb: 3,
              color: "#fff",
            }}
          >
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={isMobile ? "listWeek" : "dayGridMonth"}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: isMobile ? "listWeek dayGridMonth" : "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
              }}
              selectable={false}
              editable={false}
              dayMaxEvents
              events={events.map((evt) => ({
                ...evt,
                id: evt.id,
                backgroundColor: eventTypeColors[evt.type] || eventTypeColors.Other,
                borderColor: eventTypeColors[evt.type] || eventTypeColors.Other,
              }))}
              eventContent={renderEventContent}
              height="auto"
            />
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.5, sm: 2.5 },
              borderRadius: 3,
              background: "rgba(136, 134, 134, 0.44)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              color: "#fff",
            }}
          >
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1, color: "#fff" }}>
              Upcoming events
            </Typography>
            <Divider sx={{ mb: 2, borderColor: "rgba(255,255,255,0.2)" }} />
            {upcomingEvents.length === 0 ? (
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                No events posted yet.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {upcomingEvents.map((evt) => {
                  const color = eventTypeColors[evt.type] || eventTypeColors.Other;
                  return (
                    <Box
                      key={evt.id}
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 2,
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: "rgba(0,0,0,0.2)",
                        borderLeft: `4px solid ${color}`,
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                          <Chip
                            label={evt.type || "Other"}
                            size="small"
                            sx={{ bgcolor: color, color: "#fff", fontWeight: 600 }}
                          />
                          <Typography fontWeight={700} sx={{ color: "#fff" }}>
                            {evt.title}
                          </Typography>
                        </Box>
                        {evt.description && (
                          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)", mb: 0.8, lineHeight: 1.4 }}>
                            {evt.description}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                          {evt.start ? evt.start.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default CalendarofEvents;
