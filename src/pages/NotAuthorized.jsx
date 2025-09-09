import React, { useEffect } from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

const NotAuthorized = () => {
  const navigate = useNavigate();

  // 🚀 Auto sign-out when reaching this page
  useEffect(() => {
    const doLogout = async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Error signing out:", error);
      }
    };
    doLogout();
  }, []);

  const handleGoBack = () => {
    navigate("/login", { replace: true });
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "linear-gradient(135deg, #ff7675, #d63031)",
      }}
    >
      <Paper elevation={4} sx={{ padding: 5, textAlign: "center", maxWidth: 400 }}>
        <Typography variant="h4" color="error" gutterBottom>
          🚫 Access Denied
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          You are not authorized to view this page.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleGoBack}
          sx={{ borderRadius: 2, px: 4 }}
        >
          Go Back to Login
        </Button>
      </Paper>
    </Box>
  );
};

export default NotAuthorized;