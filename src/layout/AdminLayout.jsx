import React from "react";
import { Box } from "@mui/material";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const AdminLayout = ({ children }) => {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      <Box sx={{ flexGrow: 1 }}>
        <Topbar />
        <Box sx={{ p: 3, background: "linear-gradient(160deg, #2c3e50, #34495e, #2c3e50)", minHeight: "100vh" }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;