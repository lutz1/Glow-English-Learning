import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  CircularProgress,
} from "@mui/material";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

const TeacherPerformance = () => {
  return (
    <Box display="flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <Box flexGrow={1}>
        <Topbar />
        <Box
          sx={{
            p: 4,
            minHeight: "100vh",
            background: "linear-gradient(160deg, #2c3e50, #34495e, #2c3e50)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Card
            sx={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(16px)",
              borderRadius: "20px",
              boxShadow: "0 12px 28px rgba(0,0,0,0.5)",
              color: "#fff",
              textAlign: "center",
              p: 6,
              maxWidth: 600,
              width: "100%",
            }}
          >
            <CardContent>
              <Stack spacing={3} alignItems="center" justifyContent="center">
                <Typography
                  variant="h3"
                  sx={{ fontWeight: "bold", color: "#64b5f6" }}
                >
                  📊 Teacher Performance
                </Typography>

                {/* Animated Loader */}
                <CircularProgress
                  size={60}
                  thickness={4.5}
                  sx={{ color: "#64b5f6" }}
                />

                <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.85)" }}>
                  Coming Soon...
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: "rgba(255,255,255,0.6)",
                    maxWidth: 500,
                  }}
                >
                  We’re building advanced analytics and insights to help you
                  track teacher effectiveness, session quality, and performance
                  trends. Stay tuned!
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default TeacherPerformance;