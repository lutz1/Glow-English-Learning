// src/pages/teacher/StartSession.jsx 
import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import { motion } from "framer-motion";
import { Groups, Language, EmojiEvents, Person, Translate, Close, InfoOutlined } from "@mui/icons-material";

import TeacherSidebar from "../../components/TeacherSidebar";
import TeacherTopbar from "../../components/TeacherTopbar";
import { db, storage } from "../../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../hooks/useAuth";
import { useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import bg from "../../assets/bg.gif"; // spooky Halloween background

const CLASS_SETTINGS = {
  "Private Class": {
    rate: 100,
    duration: 25,
    icon: <Person fontSize="large" sx={{ color: "#fff" }} />,
    gradient: "linear-gradient(135deg, #42a5f5, #1e88e5)",
    custom: true,
    // tooltip content added
    tooltip:
      "Absences are not paid.\n\nIn case of emergency, please inform Miss Grace directly.\n\nSalary: Every 16th of the month.",
  },
  "Group Class": {
    rate: 200,
    duration: 30,
    icon: <Groups fontSize="large" sx={{ color: "#fff" }} />,
    gradient: "linear-gradient(135deg, #ab47bc, #8e24aa)",
    custom: false,
    tooltip:
      "In case of emergency, please inform Miss Anklhyyn directly.\n\nSalary: Every 16th of the month.",
  },
  "Hao Class": {
    rate: 75,
    duration: 25,
    icon: <Translate fontSize="large" sx={{ color: "#fff" }} />,
    gradient: "linear-gradient(135deg, #ff9800, #f57c00)",
    custom: false,
    tooltip:
      "Absences are still paid as long as you stay in the class for the full 25 minutes.\n\nIn case of emergency, please inform the parents in the GC.\n\nSalary: Every 1st and 16th of the month.",
  },
  "Vietnamese Class": {
  rate: 75, // ₱75 per session
  duration: 30, // Updated: duration is now 30 minutes
  icon: <Language fontSize="large" sx={{ color: "#fff" }} />,
  gradient: "linear-gradient(135deg, #66bb6a, #388e3c)",
  custom: true,
  tooltip:
    "Absent with permission: Not paid\n\nAbsent without permission: Half paid\n\nIn case of emergency, please inform the parents in the GC and Ma’am Thanh.\n\nSalary: Every 1st and 16th of the month.",
},
  IELTS: {
    rate: 250,
    duration: 60,
    icon: <EmojiEvents fontSize="large" sx={{ color: "#fff" }} />,
    gradient: "linear-gradient(135deg, #fdd835, #fbc02d)",
    custom: false,
    tooltip: "",
  },
};

const drawerWidth = 240;

const StartSession = () => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const [running, setRunning] = useState(false);
  const [classType, setClassType] = useState("");
  const [targetSeconds, setTargetSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState(null);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [selectedHours, setSelectedHours] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState(0);
  const [cancelDialog, setCancelDialog] = useState(false);

  const startTsRef = useRef(null);
  const intervalRef = useRef(null);

  // Restore unfinished sessions
  useEffect(() => {
    if (!currentUser) return;
    const fetchSession = async () => {
      const q = query(
        collection(db, "sessions"),
        where("teacherId", "==", currentUser.uid),
        where("status", "in", ["ongoing", "awaiting_screenshot"])
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docData = snap.docs[0];
        const data = docData.data();
        setSessionId(docData.id);
        setClassType(data.classType);
        setTargetSeconds(data.durationSeconds);
        startTsRef.current = data.startTime?.toDate().getTime();
        setElapsedSeconds(Math.floor((Date.now() - startTsRef.current) / 1000));
        setStatus(data.status);
        setRunning(data.status === "ongoing");
      }
    };
    fetchSession();
  }, [currentUser]);

  // Timer effect
  useEffect(() => {
    if (running && status === "ongoing") {
      if (!startTsRef.current) startTsRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startTsRef.current) / 1000);
        setElapsedSeconds(secs);

        if (targetSeconds > 0 && secs >= targetSeconds) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setRunning(false);
          setStatus("awaiting_screenshot");
          if (sessionId) {
            updateDoc(doc(db, "sessions", sessionId), {
              status: "awaiting_screenshot",
              endTime: serverTimestamp(),
            });
          }
        }
      }, 1000);
    }
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [running, targetSeconds, sessionId, status]);

  const formatMMSS = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleClassClick = async (key) => {
    if (running || status === "ongoing" || status === "awaiting_screenshot") return;

    const q = query(
      collection(db, "sessions"),
      where("teacherId", "==", currentUser.uid),
      where("status", "in", ["ongoing", "awaiting_screenshot"])
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      alert("⚠️ You already have an active session.");
      return;
    }

    const classConfig = CLASS_SETTINGS[key];
    setClassType(key);
    if (classConfig.custom) {
      setSelectedHours(0);
      setSelectedMinutes(classConfig.duration);
      setOpenDialog(true);
    } else {
      setConfirmDialog(true);
    }
  };

  const startFixedClass = async () => {
    if (!currentUser) return;
    const q = query(
      collection(db, "sessions"),
      where("teacherId", "==", currentUser.uid),
      where("status", "in", ["ongoing", "awaiting_screenshot"])
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      alert("⚠️ You already have an active session.");
      setConfirmDialog(false);
      return;
    }
    const classConfig = CLASS_SETTINGS[classType];
    const totalMinutes = classConfig.duration;
    const totalEarnings = classConfig.rate;

    setTargetSeconds(totalMinutes * 60);
    setElapsedSeconds(0);
    startTsRef.current = Date.now();
    setRunning(true);
    setStatus("ongoing");

    const docRef = await addDoc(collection(db, "sessions"), {
      teacherId: currentUser.uid,
      classType,
      rate: classConfig.rate,
      durationSeconds: totalMinutes * 60,
      totalEarnings,
      startTime: serverTimestamp(),
      status: "ongoing",
    });
    setSessionId(docRef.id);
    setConfirmDialog(false);
  };

  const confirmStart = async () => {
    if (!currentUser) return;
    const q = query(
      collection(db, "sessions"),
      where("teacherId", "==", currentUser.uid),
      where("status", "in", ["ongoing", "awaiting_screenshot"])
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      alert("⚠️ You already have an active session.");
      setOpenDialog(false);
      return;
    }
    const classConfig = CLASS_SETTINGS[classType];
    const totalMinutes = selectedHours * 60 + selectedMinutes;
    if (totalMinutes < classConfig.duration) {
      alert(`⚠️ Minimum duration is ${classConfig.duration} minutes`);
      return;
    }
    const perMinuteRate = classConfig.rate / classConfig.duration;
    const totalEarnings = perMinuteRate * totalMinutes;

    setTargetSeconds(totalMinutes * 60);
    setElapsedSeconds(0);
    startTsRef.current = Date.now();
    setRunning(true);
    setStatus("ongoing");
    setOpenDialog(false);

    const docRef = await addDoc(collection(db, "sessions"), {
      teacherId: currentUser.uid,
      classType,
      rate: classConfig.rate,
      durationSeconds: totalMinutes * 60,
      totalEarnings,
      startTime: serverTimestamp(),
      status: "ongoing",
    });
    setSessionId(docRef.id);
  };

  const handleStop = async () => {
    if (sessionId) {
      clearInterval(intervalRef.current);
      setRunning(false);
      setStatus("awaiting_screenshot");
      await updateDoc(doc(db, "sessions", sessionId), {
        status: "awaiting_screenshot",
        actualDuration: elapsedSeconds,
        actualEarnings: CLASS_SETTINGS[classType].rate,
        endTime: serverTimestamp(),
      });
      setConfirmDialog(false);
    }
  };

  const handleCancel = async () => {
    if (sessionId) {
      await deleteDoc(doc(db, "sessions", sessionId));
      clearInterval(intervalRef.current);
      setRunning(false);
      setClassType("");
      setStatus(null);
      setSessionId(null);
      setElapsedSeconds(0);
    }
    setCancelDialog(false);
  };

  const handleHalfPay = async () => {
    if (sessionId && classType === "Vietnamese Class") {
      clearInterval(intervalRef.current);
      setRunning(false);
      setStatus("awaiting_screenshot");

      await updateDoc(doc(db, "sessions", sessionId), {
        status: "awaiting_screenshot",
        actualDuration: elapsedSeconds,
        actualEarnings: CLASS_SETTINGS[classType].rate / 2,
        halfPay: true,
        endTime: serverTimestamp(),
      });
    }
  };

  const handleUpload = async () => {
    if (!screenshotFile || !sessionId) return;

    try {
      const filePath = `screenshots/${currentUser.uid}/${Date.now()}_${screenshotFile.name}`;
      const storageRef = ref(storage, filePath);

      setUploading(true);
      setUploadProgress(0);

      const uploadTask = uploadBytesResumable(storageRef, screenshotFile);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("❌ Upload failed:", error);
          alert("❌ Upload failed. Please try again.");
          setUploading(false);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          await updateDoc(doc(db, "sessions", sessionId), {
            status: "completed",
            screenshotUrl: downloadURL,
            screenshotName: screenshotFile.name,
          });
          setStatus("completed");
          setClassType("");
          setRunning(false);
          setSessionId(null);
          setElapsedSeconds(0);
          setScreenshotFile(null);
          setUploading(false);
          alert("✅ Screenshot uploaded successfully!");
        }
      );
    } catch (error) {
      console.error("Upload failed:", error);
      alert("❌ Upload failed. Please try again.");
      setUploading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Halloween Background */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `url(${bg}) center/cover no-repeat`,
          zIndex: -3,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          width: "200%",
          height: "200%",
          background: "radial-gradient(rgba(0,0,0,0.25), transparent 70%)",
          animation: "smoke 80s linear infinite",
          zIndex: -2,
        }}
      />
      <Box
        sx={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: "linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.8))",
          zIndex: -1,
        }}
      />
      <style>{`
        @keyframes smoke {
          0% { transform: translate(0,0) rotate(0deg); }
          50% { transform: translate(-20%, -20%) rotate(180deg); }
          100% { transform: translate(0,0) rotate(360deg); }
        }
      `}</style>

      <TeacherSidebar open={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${sidebarOpen ? drawerWidth : 60}px)` },
          transition: "width 0.3s",
          minHeight: "100vh",
          color: "#fff",
        }}
      >
        <TeacherTopbar open={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <Box sx={{ flexGrow: 1, overflowY: "auto", px: { xs: 2, sm: 3, md: 3 }, pt: "64px" }}>
          <Typography
            variant="h4"
            fontWeight="bold"
            gutterBottom
            sx={{ color: "#ff9800", textShadow: "0 0 12px #ff5722", textAlign: "center" }}
          >
            🎃 Spooky Start Session
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{ mb: 4, color: "#f5f5f5", textShadow: "0 0 4px #ff9800", textAlign: "center" }}
          >
            Begin your classes in Halloween style! Track time, earnings, and upload screenshots.
          </Typography>

          {/* ===== Main Paper UI ===== */}
          <Paper
            sx={{
              p: 4,
              borderRadius: 3,
              backdropFilter: "blur(12px)",
              background: "rgba(0,0,0,0.25)",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 3,
              }}
            >
              {Object.keys(CLASS_SETTINGS).map((key) => {
                const isActive = classType === key && (status === "ongoing" || status === "awaiting_screenshot");
                const classConfig = CLASS_SETTINGS[key];

                return (
                  <Tooltip
                    key={key}
                    title={<Box sx={{ whiteSpace: "pre-line", fontSize: 13 }}>{classConfig.tooltip}</Box>}
                    arrow
                    placement="top"
                  >
                    <motion.div
                      whileHover={!isActive ? { scale: 1.05 } : {}}
                      whileTap={!isActive ? { scale: 0.95 } : {}}
                      onClick={() => handleClassClick(key)}
                    >
                      <Card
                        sx={{
                          minHeight: 200,
                          color: "#fff",
                          background: classConfig.gradient,
                          borderRadius: 3,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          p: 2,
                          opacity: !isActive && (running || status === "awaiting_screenshot") ? 0.5 : 1,
                          pointerEvents: !isActive && (running || status === "awaiting_screenshot") ? "none" : "auto",
                          boxShadow: `0 0 15px ${isActive ? "#ff5722" : "rgba(0,0,0,0.2)"}`,
                        }}
                      >
                        <CardContent sx={{ textAlign: "center", width: "100%" }}>
                          {classConfig.icon}
                          <Typography variant="h6" sx={{ mt: 1, fontWeight: 700 }}>
                            {key}
                          </Typography>

                          {!isActive && (
                            <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
                              ₱{classConfig.rate} ({classConfig.duration} mins)
                            </Typography>
                          )}

                          {isActive && status === "ongoing" && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="h5">⏱ {formatMMSS(elapsedSeconds)}</Typography>
                              <Typography
                                variant="h5"
                                sx={{
                                  fontWeight: "bold",
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  gap: 1,
                                  mt: 1,
                                }}
                              >
                                💰 ₱{classConfig.rate}
                              </Typography>

                              <Box sx={{ mt: 2, display: "flex", gap: 1, justifyContent: "center" }}>
                                <Button variant="contained" color="success" onClick={handleStop}>
                                  Stop
                                </Button>
                                <Button variant="contained" color="error" onClick={() => setCancelDialog(true)}>
                                  Cancel
                                </Button>
                                {key === "Vietnamese Class" && elapsedSeconds >= 900 && (
                                  <Button variant="contained" color="warning" onClick={handleHalfPay}>
                                    Half Pay
                                  </Button>
                                )}
                              </Box>
                            </Box>
                          )}

                          {isActive && status === "awaiting_screenshot" && (
                            <Box sx={{ mt: 2, width: "100%" }}>
                              <Typography variant="body1" sx={{ mb: 1, fontWeight: "bold" }}>
                                🕸 Please upload screenshot to complete
                              </Typography>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setScreenshotFile(e.target.files[0])}
                                style={{ marginBottom: "10px" }}
                              />
                              {uploading ? (
                                <Box sx={{ width: "100%", mt: 1 }}>
                                  <Typography variant="body2">Uploading... {Math.round(uploadProgress)}%</Typography>
                                  <LinearProgress
                                    variant="determinate"
                                    value={uploadProgress}
                                    sx={{ height: 8, borderRadius: 5, mt: 1 }}
                                  />
                                </Box>
                              ) : (
                                <Button
                                  variant="contained"
                                  color="primary"
                                  onClick={handleUpload}
                                  disabled={!screenshotFile}
                                >
                                  Upload Screenshot
                                </Button>
                              )}
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Tooltip>
                );
              })}
            </Box>
          </Paper>

          {/* Dialogs remain unchanged */}
          <Dialog
            open={openDialog}
            onClose={() => setOpenDialog(false)}
            PaperProps={{ sx: { borderRadius: 3, p: 1, width: "400px", maxWidth: "90%" } }}
          >
            <DialogTitle sx={{ fontWeight: "bold", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              Set Duration for {classType}
              <IconButton onClick={() => setOpenDialog(false)} size="small">
                <Close />
              </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ mt: 2 }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Hours</InputLabel>
                  <Select value={selectedHours} onChange={(e) => setSelectedHours(e.target.value)}>
                    {[...Array(6).keys()].map((h) => (
                      <MenuItem key={h} value={h}>
                        {h}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                <InputLabel>Minutes</InputLabel>
                <Select
                  value={selectedMinutes}
                  onChange={(e) => setSelectedMinutes(Number(e.target.value))}
                >
                  {/* Updated: allow 0 minutes for exact hours, and all minutes from 0 to 59 */}
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                    <MenuItem
                      key={m}
                      value={m}
                      disabled={selectedHours === 0 && m < (CLASS_SETTINGS[classType]?.duration || 0)} // enforce minimum duration
                    >
                      {m}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              </Box>
              <Typography sx={{ mt: 2, fontSize: 13, color: "text.secondary" }}>
                Minimum: {CLASS_SETTINGS[classType]?.duration || 0} minutes
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
              <Button variant="contained" color="primary" onClick={confirmStart}>
                Start
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
            <DialogTitle>Start {classType}?</DialogTitle>
            <DialogActions>
              <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
              <Button variant="contained" onClick={startFixedClass}>
                Start
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)}>
            <DialogTitle>Do you want to cancel this session?</DialogTitle>
            <DialogActions>
              <Button onClick={() => setCancelDialog(false)}>No</Button>
              <Button variant="contained" color="error" onClick={handleCancel}>
                Yes, Cancel
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
  
};

export default StartSession;