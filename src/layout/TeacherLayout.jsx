import React from "react";
import { Box } from "@mui/material";
import TeacherSidebar from "../components/TeacherSidebar";
import TeacherTopbar from "../components/TeacherTopbar";

const TeacherLayout = ({ children }) => {
  return (
    <Box
      display="flex"
      sx={{
        height: "100vh", // ✅ full viewport height
        background: "linear-gradient(135deg, #74b9ff, #a29bfe, #81ecec)", // global background
        overflow: "hidden", // ✅ prevent body scroll
      }}
    >
      {/* Sidebar */}
      <TeacherSidebar />

      {/* Main Content */}
      <Box
        flexGrow={1}
        display="flex"
        flexDirection="column"
        sx={{
          height: "100%", // ✅ matches sidebar
          overflow: "hidden", // ✅ no extra scroll
        }}
      >
        {/* Topbar */}
        <TeacherTopbar />

        {/* Page Content */}
        <Box
          flexGrow={1}
          p={3}
          sx={{
            overflowY: "auto", // ✅ only scroll inside content, not layout
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default TeacherLayout;