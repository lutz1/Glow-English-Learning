import React, { useState, useEffect } from "react";
import { Box, useMediaQuery, useTheme, Drawer } from "@mui/material";
import TeacherSidebar from "../components/TeacherSidebar";
import TeacherTopbar from "../components/TeacherTopbar";

const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 80;
const TOPBAR_HEIGHT_DESKTOP = 64;
const TOPBAR_HEIGHT_MOBILE = 56;

const TeacherLayout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [collapsed, setCollapsed] = useState(
    () => JSON.parse(localStorage.getItem("teacherSidebarCollapsed")) || false
  );

  // 🔄 Sync sidebar collapse across components
  useEffect(() => {
    const handleSidebarToggle = (e) => {
      if (e.detail !== undefined) {
        setCollapsed(e.detail);
      } else {
        setCollapsed(
          JSON.parse(localStorage.getItem("teacherSidebarCollapsed")) || false
        );
      }
    };

    window.addEventListener("sidebarToggle", handleSidebarToggle);
    return () =>
      window.removeEventListener("sidebarToggle", handleSidebarToggle);
  }, []);

  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;
  const topbarHeight = isMobile
    ? TOPBAR_HEIGHT_MOBILE
    : TOPBAR_HEIGHT_DESKTOP;

  return (
    <Box
      display="flex"
      sx={{
        height: "100vh",
        background: "linear-gradient(135deg, #74b9ff, #a29bfe, #81ecec)",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={!collapsed}
          onClose={() => setCollapsed(true)}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: EXPANDED_WIDTH,
              background: "linear-gradient(135deg, #a29bfe, #74b9ff, #81ecec)",
              color: "#fff",
              boxShadow: 3,
            },
          }}
        >
          <TeacherSidebar />
        </Drawer>
      ) : (
        <TeacherSidebar />
      )}

      {/* Main Content */}
      <Box
        flexGrow={1}
        display="flex"
        flexDirection="column"
        sx={{
          height: "100%",
          overflow: "hidden",
          ml: isMobile ? 0 : `${sidebarWidth}px`,
          transition: "margin 0.3s ease, width 0.3s ease",
        }}
      >
        {/* Topbar */}
        <TeacherTopbar />

        {/* Page Content */}
        <Box
          flexGrow={1}
          p={3}
          sx={{
            overflowY: "auto",
            mt: `${topbarHeight}px`, // 👈 Push content below the topbar
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default TeacherLayout;