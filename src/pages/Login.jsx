import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import Swal from "sweetalert2";

const Login = () => {
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();

  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [contacting, setContacting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  useEffect(() => {
    if (!loading && currentUser?.role) {
      navigate(`/${currentUser.role}/dashboard`, { replace: true });
    }
  }, [currentUser, loading, navigate]);

  const handleRoleChange = (event, newRole) => {
    if (newRole) setRole(newRole);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = userCredential.user.uid;

      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error("Email is not registered. Please check or contact Admin.");
      }

      const userData = userDoc.data();

      if (!userData?.role) {
        throw new Error("No role found for this user.");
      }

      if (userData.role !== role) {
        await signOut(auth);
        navigate("/not-authorized", { replace: true });
        return;
      }

      navigate(`/${userData.role}/dashboard`, { replace: true });

      // ✅ Success alert with logo
      Swal.fire({
        imageUrl: require("../assets/logo.jpg"),
        imageWidth: 80,
        imageHeight: 80,
        imageAlt: "Glow English Logo",
        title: "Login Successful 🎉",
        text: `Welcome back, ${userData.name || "User"}!`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Login error:", err);

      // ❌ Error alert with logo
      Swal.fire({
        imageUrl: require("../assets/logo.jpg"),
        borderRadius : "10px",
        imageWidth: 80,
        imageHeight: 80,
        imageAlt: "Glow English Logo",
        title: "Login Failed",
        text: err.message.includes("wrong-password")
          ? "Incorrect password. Please try again."
          : err.message.includes("user-not-found")
          ? "Email is not registered. Please check or contact Admin."
          : err.message,
        confirmButtonColor: "#2575fc",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const checkPendingRequest = async (inputEmail) => {
    if (!inputEmail) return setHasPendingRequest(false);

    try {
      const notifQuery = query(
        collection(db, "notifications"),
        where("teacherEmail", "==", inputEmail),
        where("status", "==", "pending"),
        where("type", "==", "password_reset_request")
      );
      const snapshot = await getDocs(notifQuery);
      setHasPendingRequest(!snapshot.empty);
    } catch (err) {
      console.error("Error checking requests:", err);
      setHasPendingRequest(false);
    }
  };

  const handleContactAdmin = async () => {
    setError("");
    setContacting(true);
    setContactSuccess(false);

    if (!email.trim()) {
      Swal.fire({
        imageUrl: require("../assets/logo.jpg"),
        borderRadius : "10px",
        imageWidth: 80,
        imageHeight: 80,
        imageAlt: "Glow English Logo",
        title: "Missing Email",
        text: "Please enter your registered email.",
        confirmButtonColor: "#2575fc",
      });
      setContacting(false);
      return;
    }

    try {
      await checkPendingRequest(email);
      if (hasPendingRequest) {
        Swal.fire({
          imageUrl: require("../assets/logo.jpg"),
          borderRadius : "10px",
          imageWidth: 80,
          imageHeight: 80,
          imageAlt: "Glow English Logo",
          title: "Request Already Pending",
          text: "You already have a pending reset request.",
          confirmButtonColor: "#2575fc",
        });
        setContacting(false);
        return;
      }

      await addDoc(collection(db, "notifications"), {
        type: "password_reset_request",
        teacherEmail: email,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // ✅ Success popup with logo
      Swal.fire({
        imageUrl: require("../assets/logo.jpg"),
        borderRadius : "10px",
        imageWidth: 80,
        imageHeight: 80,
        imageAlt: "Glow English Logo",
        title: "Request Sent ✅",
        text: "Admin will reset your password shortly.",
        timer: 2500,
        showConfirmButton: false,
      });

      setContactSuccess(true);
      setHasPendingRequest(true);
    } catch (err) {
      console.error("Contact admin error:", err);
      Swal.fire({
        imageUrl: require("../assets/logo.jpg"),
        imageWidth: 80,
        imageHeight: 80,
        imageAlt: "Glow English Logo",
        title: "Error",
        text: err.message,
        confirmButtonColor: "#2575fc",
      });
    } finally {
      setContacting(false);
    }
  };

  useEffect(() => {
    setHasPendingRequest(false);
  }, [email]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        sx={{
          background: "linear-gradient(135deg, #1e3c72, #2a5298)",
          filter: "blur(6px)",
        }}
      >
        <CircularProgress sx={{ color: "#fff" }} />
      </Box>
    );
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{
        background: "linear-gradient(135deg, #1e3c72, #2a5298, #1e3c72)",
        backgroundSize: "400% 400%",
        animation: "softGradient 20s ease infinite",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Blurred background overlay */}
      <Box
        sx={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backdropFilter: "blur(8px)",
          zIndex: 0,
        }}
      />

      {/* Login Card */}
      <Box
        sx={{
          backdropFilter: "blur(15px)",
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          borderRadius: 6,
          padding: 4,
          width: 420,
          maxWidth: "90%",
          boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.25)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: 540,
          zIndex: 1,
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <img
            src={require("../assets/logo.jpg")}
            alt="Logo"
            style={{
              width: 100,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.6)",
              animation: "floatLogo 5s ease-in-out infinite",
              boxShadow: "0 0 20px rgba(255,255,255,0.2)",
            }}
          />
          <Typography
            variant="h4"
            fontWeight="bold"
            mt={2}
            color="white"
            sx={{ textShadow: "0 0 15px rgba(0,0,0,0.6)" }}
          >
            Glow English Login
          </Typography>
        </Box>

        {/* Role toggle */}
        <ToggleButtonGroup
          value={role}
          exclusive
          onChange={handleRoleChange}
          fullWidth
          sx={{
            mb: 2,
            "& .MuiToggleButton-root": {
              color: "white",
              borderColor: "rgba(255,255,255,0.3)",
              fontWeight: "bold",
              "&.Mui-selected": {
                backgroundColor: "rgba(255,255,255,0.25)",
                color: "white",
                borderColor: "white",
              },
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.15)",
              },
            },
          }}
        >
          <ToggleButton value="admin">Admin</ToggleButton>
          <ToggleButton value="teacher">Teacher</ToggleButton>
        </ToggleButtonGroup>

        {/* Form */}
        <Box component="form" onSubmit={handleLogin} sx={{ flexGrow: 1 }}>
          <TextField
            label="Email"
            fullWidth
            variant="outlined"
            margin="normal"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
              setContactSuccess(false);
            }}
            required
            sx={{
              input: { color: "white" },
              label: { color: "rgba(255,255,255,0.8)" },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "rgba(255,255,255,0.4)" },
                "&:hover fieldset": { borderColor: "#fff" },
                "&.Mui-focused fieldset": { borderColor: "#fff" },
              },
            }}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            sx={{
              input: { color: "white" },
              label: { color: "rgba(255,255,255,0.8)" },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "rgba(255,255,255,0.4)" },
                "&:hover fieldset": { borderColor: "#fff" },
                "&.Mui-focused fieldset": { borderColor: "#fff" },
              },
            }}
          />

          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              mt: 3,
              py: 1.4,
              background: "linear-gradient(45deg, #6a11cb, #2575fc)",
              color: "white",
              fontWeight: "bold",
              borderRadius: 2,
              boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
              transition: "all 0.4s ease",
              "&:hover": {
                background: "linear-gradient(45deg, #2575fc, #6a11cb)",
                transform: "translateY(-2px)",
                boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
              },
            }}
            disabled={submitting}
          >
            {submitting ? "Logging in..." : "Login"}
          </Button>

          {/* Contact Admin */}
          <Box sx={{ mt: 4, textAlign: "center" }}>
            <Typography variant="body2" sx={{ mb: 1 }} color="white">
              Forgot your password? Contact Administrator
            </Typography>
            <Button
              variant="contained"
              sx={{
                background: "rgba(255,255,255,0.2)",
                color: "white",
                fontWeight: "bold",
                borderRadius: 2,
                "&:hover": {
                  background: "rgba(255,255,255,0.35)",
                  transform: "translateY(-2px)",
                },
              }}
              onClick={handleContactAdmin}
              disabled={contacting || hasPendingRequest}
            >
              {contacting ? "Sending..." : hasPendingRequest ? "Request Pending" : "Contact Admin"}
            </Button>
          </Box>
        </Box>
      </Box>

      <style>
        {`
          @keyframes floatLogo {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
            100% { transform: translateY(0px); }
          }
          @keyframes softGradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>
    </Box>
  );
};

export default Login;