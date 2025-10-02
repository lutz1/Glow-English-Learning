import React from "react";
import { Box, useMediaQuery } from "@mui/material";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const AdminLayout = ({ children }) => {
  const isMobile = useMediaQuery("(max-width:600px)");

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        minHeight: "100vh",
        width: "100vw",
        overflowX: "hidden",
      }}
    >
      <Sidebar />
      <Box sx={{ flexGrow: 1, width: "100%" }}>
        <Topbar />
        <Box
          sx={{
            p: { xs: 1, sm: 3 },
            background:
              "linear-gradient(160deg, #2c3e50, #34495e, #2c3e50)",
            minHeight: "100vh",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;