import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
} from "@mui/material";
import { motion } from "framer-motion";
import { School, Groups, Public, Language, EmojiEvents, AccessTime } from "@mui/icons-material";
import TeacherLayout from "../../layout/TeacherLayout";
import { db } from "../../firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

const CLASS_SETTINGS = {
  "Private Class": { rate: 100, duration: 25, icon: <School fontSize="large" />, customDuration: true },
  "Group Class": { rate: 200, duration: 30, icon: <Groups fontSize="large" />, customDuration: false },
  "Chinese Class": { rate: 75, duration: 25, icon: <Public fontSize="large" />, customDuration: false },
  "Vietnamese Class": { rate: 75, duration: 30, icon: <Language fontSize="large" />, customDuration: true },
  "IELTS": { rate: 250, duration: 60, icon: <EmojiEvents fontSize="large" />, customDuration: false },
};

const iconAnimation = {
  hover: { scale: 1.3, rotate: 15 },
  tap: { scale: 0.9, rotate: -10 },
  animate: { rotate: [0, 10, -10, 10, 0], transition: { repeat: Infinity, duration: 2 } }
};

const StartSession = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  const [classType, setClassType] = useState("");
  const [rate, setRate] = useState(0);
  const [targetSeconds, setTargetSeconds] = useState(0);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [halfPayLate, setHalfPayLate] = useState(false);

  const [running, setRunning] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionId, setSessionId] = useState(null);

  const startTsRef = useRef(null);
  const intervalRef = useRef(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");

  // Restore ongoing session
  useEffect(() => {
    const saved = localStorage.getItem("ongoingSession");
    if (saved) {
      const s = JSON.parse(saved);
      setSessionId(s.sessionId);
      setClassType(s.classType);
      setRate(CLASS_SETTINGS[s.classType].rate);
      setTargetSeconds(CLASS_SETTINGS[s.classType].duration * 60);
      setRunning(true);
      startTsRef.current = s.startTs;
    }
  }, []);

  // Persist session state
  useEffect(() => {
    if (sessionId && running && startTsRef.current) {
      localStorage.setItem(
        "ongoingSession",
        JSON.stringify({ sessionId, classType, startTs: startTsRef.current })
      );
    } else {
      localStorage.removeItem("ongoingSession");
    }
  }, [sessionId, running, classType]);

  // Role guard
  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== "teacher")) {
      navigate("/login");
    }
  }, [loading, currentUser, navigate]);

  // Update rate, targetSeconds, and total earnings
  useEffect(() => {
    if (!classType) return setRate(0);

    setRate(CLASS_SETTINGS[classType].rate);
    let durationSec = CLASS_SETTINGS[classType].duration * 60;
    if (CLASS_SETTINGS[classType].customDuration) {
      durationSec = customHours * 3600 + customMinutes * 60;
    }
    setTargetSeconds(durationSec);

    // Dynamic earnings calculation
    let earnings = (CLASS_SETTINGS[classType].rate / CLASS_SETTINGS[classType].duration) * (durationSec / 60);
    if (classType === "Vietnamese Class" && halfPayLate) {
      earnings = earnings / 2;
    }
    setTotalEarnings(Math.round(earnings * 100) / 100);
  }, [classType, customHours, customMinutes, halfPayLate]);

  // Timer
  useEffect(() => {
    if (running) {
      if (!startTsRef.current) startTsRef.current = Date.now();

      intervalRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startTsRef.current) / 1000);
        setElapsedSeconds(secs);

        if (targetSeconds > 0 && secs >= targetSeconds) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setRunning(false);
          setStopped(true);
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, targetSeconds]);

  const formatMMSS = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleStart = async () => {
    if (!classType) return alert("Please select a class type.");
    if (CLASS_SETTINGS[classType].customDuration && targetSeconds === 0)
      return alert("Please set a custom duration for this class.");
    if (!currentUser) return alert("You must be logged in as a teacher.");

    setElapsedSeconds(0);
    startTsRef.current = Date.now();
    setRunning(true);
    setStopped(false);

    try {
      const docRef = await addDoc(collection(db, "sessions"), {
        teacherId: currentUser.uid,
        teacherName: currentUser.displayName || currentUser.email || "Teacher",
        teacherEmail: currentUser.email || "",
        classType,
        rate: CLASS_SETTINGS[classType].rate,
        durationSeconds: targetSeconds,
        totalEarnings,
        startTime: serverTimestamp(),
        status: "ongoing",
        createdAt: serverTimestamp(),
      });
      setSessionId(docRef.id);
    } catch (err) {
      console.error("Error starting session:", err);
      alert("Failed to start session.");
    }
  };

  const handleStop = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setStopped(true);

    if (sessionId) {
      await updateDoc(doc(db, "sessions", sessionId), {
        endTime: serverTimestamp(),
        durationMinutes: Math.floor(elapsedSeconds / 60),
        durationSeconds: elapsedSeconds,
        totalEarnings,
        status: "awaiting_screenshot",
        updatedAt: serverTimestamp(),
      });
    }
  };

  const handleCancel = async () => {
    if (!sessionId) return;
    if (!window.confirm("Are you sure you want to cancel this session?")) return;

    try {
      await deleteDoc(doc(db, "sessions", sessionId));
      resetState();
      alert("Session canceled.");
    } catch (err) {
      console.error("Error canceling session:", err);
      alert("Failed to cancel session.");
    }
  };

  const handleSubmit = async () => {
    if (!sessionId) return;
    if (!screenshotPreview) return alert("Please upload a screenshot.");

    try {
      await updateDoc(doc(db, "sessions", sessionId), {
        screenshotBase64: screenshotPreview,
        status: "completed",
        updatedAt: serverTimestamp(),
      });
      resetState();
      alert("Session submitted successfully.");
    } catch (err) {
      console.error("Error submitting session:", err);
      alert("Failed to submit session.");
    }
  };

  const resetState = () => {
    startTsRef.current = null;
    setElapsedSeconds(0);
    setClassType("");
    setRate(0);
    setTargetSeconds(0);
    setCustomHours(0);
    setCustomMinutes(0);
    setHalfPayLate(false);
    setTotalEarnings(0);
    setScreenshotPreview("");
    setSessionId(null);
    setStopped(false);
    setRunning(false);
    localStorage.removeItem("ongoingSession");
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setScreenshotPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const progress = targetSeconds > 0 ? Math.min((elapsedSeconds / targetSeconds) * 100, 100) : 0;

  if (loading) return (
    <TeacherLayout>
      <Box sx={{ p: 3, textAlign: "center" }}><CircularProgress /></Box>
    </TeacherLayout>
  );

  return (
    <TeacherLayout>
      <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
        <Box sx={{ maxWidth: 1200, width: "100%" }}>
          <Paper elevation={4} sx={{ p: 4, borderRadius: 3, bgcolor: "#f7f9fc" }}>
            <Typography variant="h4" mb={4} fontWeight="bold" align="center">
              🎓 Start a Teaching Session
            </Typography>

            {/* Class selection */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 2, mb: 4 }}>
              {Object.keys(CLASS_SETTINGS).map((key) => (
                <motion.div key={key} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => !running && !stopped && setClassType(key)}>
                  <Tooltip title={CLASS_SETTINGS[key].customDuration ? "Custom duration allowed" : ""}>
                    <Card sx={{
                      minHeight: 200,
                      backgroundColor: "#fff",
                      color: "#333",
                      border: classType === key ? "2px solid #1976d2" : "1px solid #ddd",
                      cursor: running || stopped ? "not-allowed" : "pointer",
                      borderRadius: 2,
                      boxShadow: "0px 4px 12px rgba(0,0,0,0.1)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      p: 2,
                      transition: "0.3s all",
                    }}>
                      <CardContent sx={{ textAlign: "center", p: 1 }}>
                        <motion.div
                          whileHover={iconAnimation.hover}
                          whileTap={iconAnimation.tap}
                          animate={iconAnimation.animate}
                        >
                          {CLASS_SETTINGS[key].icon}
                        </motion.div>
                        <Typography variant="h6" sx={{ mt: 1, fontWeight: 600 }}>{key}</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.7, mt: 0.5 }}>
                          ₱{CLASS_SETTINGS[key].rate} / {CLASS_SETTINGS[key].duration} mins
                        </Typography>

                        {/* Custom time selectors */}
                        {CLASS_SETTINGS[key].customDuration && classType === key && (
                          <Box sx={{ display: "flex", gap: 1, mt: 1, justifyContent: "center" }}>
                            <FormControl size="small" sx={{ minWidth: 60 }}>
                              <InputLabel sx={{ color: "#1976d2" }}>Hrs</InputLabel>
                              <Select value={customHours} onChange={(e) => setCustomHours(Number(e.target.value))} sx={{ color: "#1976d2" }}>
                                {[...Array(13)].map((_, i) => <MenuItem key={i} value={i}>{i}</MenuItem>)}
                              </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 60 }}>
                              <InputLabel sx={{ color: "#1976d2" }}>Min</InputLabel>
                              <Select value={customMinutes} onChange={(e) => setCustomMinutes(Number(e.target.value))} sx={{ color: "#1976d2" }}>
                                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Box>
                        )}

                        {/* Half pay button for Vietnamese */}
                        {key === "Vietnamese Class" && classType === key && (
                          <Button
                            startIcon={<AccessTime />}
                            sx={{ mt: 1, color: halfPayLate ? "#fff" : "#1976d2", borderColor: "#1976d2" }}
                            variant={halfPayLate ? "contained" : "outlined"}
                            onClick={() => setHalfPayLate(!halfPayLate)}
                          >
                            15 min Late {halfPayLate ? "(Half Pay)" : ""}
                          </Button>
                        )}

                        {/* Total earnings */}
                        {CLASS_SETTINGS[key].customDuration && classType === key && (
                          <Typography variant="body2" mt={1} fontWeight={500} color="#1976d2">
                            Earnings: ₱{totalEarnings}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Tooltip>
                </motion.div>
              ))}
            </Box>

            {/* Timer + progress */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 4 }}>
              <Box sx={{ position: "relative", display: "inline-flex" }}>
                <CircularProgress variant="determinate" value={progress} size={90} thickness={5} />
                <Box sx={{ position: "absolute", top: 0, left: 0, bottom: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Typography variant="h6">{formatMMSS(elapsedSeconds)}</Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="h6">Class: <strong>{classType || "None selected"}</strong></Typography>
                <Typography variant="body1">Rate: ₱{rate}</Typography>
                {targetSeconds > 0 && <Typography variant="body2" color="text.secondary">Auto-stop at {formatMMSS(targetSeconds)}</Typography>}
                {CLASS_SETTINGS[classType]?.customDuration && <Typography variant="body1" color="#1976d2">Earnings: ₱{totalEarnings}</Typography>}
              </Box>
            </Box>

            {/* Controls */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
              {!running && !stopped && <Button variant="contained" sx={{ bgcolor: "#1976d2", "&:hover": { bgcolor: "#1565c0" } }} onClick={handleStart}>Start Session</Button>}
              {running && <>
                <Button variant="outlined" color="secondary" onClick={handleStop}>Stop</Button>
                <Button variant="text" color="error" onClick={handleCancel}>Cancel</Button>
              </>}
              {stopped && <>
                <Button variant="contained" component="label" disabled={!!screenshotPreview}>Upload Screenshot<input type="file" accept="image/*" hidden onChange={handleFileChange} /></Button>
                <Button variant="contained" color="success" onClick={handleSubmit} disabled={!screenshotPreview}>Submit Session</Button>
                <Button variant="text" color="error" onClick={handleCancel}>Cancel</Button>
              </>}
            </Box>

            {screenshotPreview && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" mb={1}>Screenshot Preview</Typography>
                <img src={screenshotPreview} alt="screenshot" style={{ width: "100%", maxHeight: 300, objectFit: "contain", borderRadius: 8, border: "2px solid #ccc" }} />
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </TeacherLayout>
  );
};

export default StartSession;