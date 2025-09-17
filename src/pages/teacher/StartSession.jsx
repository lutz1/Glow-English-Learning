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
} from "@mui/material";
import { motion } from "framer-motion";
import {
  Groups,
  Language,
  EmojiEvents,
  Person,
  Translate,
  Close,
} from "@mui/icons-material";
import TeacherLayout from "../../layout/TeacherLayout";
import { db, storage } from "../../firebase";
import {
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  runTransaction,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../hooks/useAuth";

// ✅ Class settings
const CLASS_SETTINGS = {
  "Private Class": {
    rate: 100,
    duration: 25,
    icon: <Person fontSize="large" sx={{ color: "#fff" }} />,
    gradient: "linear-gradient(135deg, #42a5f5, #1e88e5)",
    custom: true,
  },
  "Group Class": {
    rate: 200,
    duration: 30,
    icon: <Groups fontSize="large" sx={{ color: "#fff" }} />,
    gradient: "linear-gradient(135deg, #ab47bc, #8e24aa)",
    custom: false,
  },
  "Hao Class": {
    rate: 75,
    duration: 25,
    icon: <Translate fontSize="large" sx={{ color: "#fff" }} />,
    gradient: "linear-gradient(135deg, #ff9800, #f57c00)",
    custom: false,
  },
  "Vietnamese Class": {
    rate: 75,
    duration: 30,
    icon: <Language fontSize="large" sx={{ color: "#fff" }} />,
    gradient: "linear-gradient(135deg, #66bb6a, #388e3c)",
    custom: true,
  },
  IELTS: {
    rate: 250,
    duration: 60,
    icon: <EmojiEvents fontSize="large" sx={{ color: "#fff" }} />,
    gradient: "linear-gradient(135deg, #fdd835, #fbc02d)",
    custom: false,
  },
};

const StartSession = () => {
  const { currentUser } = useAuth();

  const [running, setRunning] = useState(false);
  const [classType, setClassType] = useState("");
  const [targetSeconds, setTargetSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState(null); // ongoing | awaiting_screenshot | completed
  const [screenshotFile, setScreenshotFile] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [openDialog, setOpenDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [selectedHours, setSelectedHours] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState(0);
  const [cancelDialog, setCancelDialog] = useState(false);

  // New: prevent double-click/duplicate session creation
  const [creatingSession, setCreatingSession] = useState(false);

  const startTsRef = useRef(null);
  const intervalRef = useRef(null);

  // ---------------------------
  // Helper: release lock
  // ---------------------------
  const releaseLock = async () => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "sessionLocks", currentUser.uid));
    } catch (err) {
      // ignore: may not exist or permission issues
      console.warn("releaseLock:", err);
    }
  };

  // 🔄 Restore unfinished sessions
  useEffect(() => {
    if (!currentUser) return;
    const fetchSession = async () => {
      try {
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
          startTsRef.current = data.startTime?.toDate
            ? data.startTime.toDate().getTime()
            : Date.now();
          setElapsedSeconds(
            Math.floor((Date.now() - startTsRef.current) / 1000)
          );
          setStatus(data.status);
          setRunning(data.status === "ongoing");
        }
      } catch (err) {
        console.error("fetchSession error:", err);
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
              endTime: serverTimestamp(), // ✅ record endTime
            }).catch((err) =>
              console.warn("Failed to update session endTime:", err)
            );
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
    // local guard
    if (creatingSession) return;

    if (running || status === "ongoing" || status === "awaiting_screenshot")
      return;

    // server-side guard: check 'sessionLocks' quickly (non-transactional)
    if (!currentUser) {
      alert("Please sign in.");
      return;
    }

    try {
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
    } catch (err) {
      console.warn("handleClassClick: quick existing-session check failed", err);
      // continue — we'll rely on transaction when starting
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

  // ---------------------------
  // Start fixed-duration class (transactional + lock)
  // ---------------------------
  const startFixedClass = async () => {
    if (!currentUser || !classType) return;
    if (creatingSession) return;

    const classConfig = CLASS_SETTINGS[classType];
    const totalMinutes = classConfig.duration;
    const totalEarnings = classConfig.rate;

    // create refs now (client-side random id) so we can set them in transaction
    const newSessionRef = doc(collection(db, "sessions"));
    const lockRef = doc(db, "sessionLocks", currentUser.uid);

    setCreatingSession(true);
    try {
      await runTransaction(db, async (transaction) => {
        const lockSnap = await transaction.get(lockRef);
        if (lockSnap.exists()) {
          // someone else has a lock (concurrent start) — abort
          throw new Error("active_session_exists");
        }

        // create session and lock in same transaction
        transaction.set(newSessionRef, {
          teacherId: currentUser.uid,
          classType,
          rate: classConfig.rate,
          durationSeconds: totalMinutes * 60,
          totalEarnings,
          startTime: serverTimestamp(),
          status: "ongoing",
        });

        transaction.set(lockRef, {
          sessionId: newSessionRef.id,
          teacherId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
      });

      // transaction committed successfully — update local state
      setTargetSeconds(totalMinutes * 60);
      setElapsedSeconds(0);
      startTsRef.current = Date.now();
      setRunning(true);
      setStatus("ongoing");
      setSessionId(newSessionRef.id);
      setConfirmDialog(false);
    } catch (err) {
      if (err?.message === "active_session_exists") {
        alert("⚠️ You already have an active session.");
      } else {
        console.error("startFixedClass transaction failed:", err);
        alert("Failed to start session. Try again.");
      }
    } finally {
      setCreatingSession(false);
    }
  };

  // ---------------------------
  // Start custom-duration class (transactional + lock)
  // ---------------------------
  const confirmStart = async () => {
    if (!currentUser || !classType) return;
    if (creatingSession) return;

    const classConfig = CLASS_SETTINGS[classType];
    const totalMinutes = selectedHours * 60 + selectedMinutes;
    if (totalMinutes < classConfig.duration) {
      alert(`⚠️ Minimum duration is ${classConfig.duration} minutes`);
      return;
    }

    const perMinuteRate = classConfig.rate / classConfig.duration;
    const totalEarnings = perMinuteRate * totalMinutes;

    const newSessionRef = doc(collection(db, "sessions"));
    const lockRef = doc(db, "sessionLocks", currentUser.uid);

    setCreatingSession(true);
    try {
      await runTransaction(db, async (transaction) => {
        const lockSnap = await transaction.get(lockRef);
        if (lockSnap.exists()) {
          throw new Error("active_session_exists");
        }

        transaction.set(newSessionRef, {
          teacherId: currentUser.uid,
          classType,
          rate: classConfig.rate,
          durationSeconds: totalMinutes * 60,
          totalEarnings,
          startTime: serverTimestamp(),
          status: "ongoing",
        });

        transaction.set(lockRef, {
          sessionId: newSessionRef.id,
          teacherId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
      });

      // success: set local state
      setTargetSeconds(totalMinutes * 60);
      setElapsedSeconds(0);
      startTsRef.current = Date.now();
      setRunning(true);
      setStatus("ongoing");
      setSessionId(newSessionRef.id);
      setOpenDialog(false);
    } catch (err) {
      if (err?.message === "active_session_exists") {
        alert("⚠️ You already have an active session.");
      } else {
        console.error("confirmStart transaction failed:", err);
        alert("Failed to start session. Try again.");
      }
    } finally {
      setCreatingSession(false);
    }
  };

  // Stop class (moves to awaiting_screenshot — keep lock)
  const handleStop = async () => {
    if (sessionId) {
      clearInterval(intervalRef.current);
      setRunning(false);
      setStatus("awaiting_screenshot");
      try {
        await updateDoc(doc(db, "sessions", sessionId), {
          status: "awaiting_screenshot",
          actualDuration: elapsedSeconds,
          actualEarnings: CLASS_SETTINGS[classType].rate,
          endTime: serverTimestamp(),
        });
      } catch (err) {
        console.warn("handleStop: failed to update session:", err);
      }
      setConfirmDialog(false); // close dialog if used
    }
  };

  // Cancel class: delete session and release lock
  const handleCancel = async () => {
    if (sessionId) {
      try {
        await deleteDoc(doc(db, "sessions", sessionId));
      } catch (err) {
        console.warn("handleCancel: failed to delete session:", err);
      }
      try {
        await releaseLock();
      } catch (err) {
        // ignore
      }
      clearInterval(intervalRef.current);
      setRunning(false);
      setClassType("");
      setStatus(null);
      setSessionId(null);
      setElapsedSeconds(0);
    }
    setCancelDialog(false);
  };

  // Half pay (Vietnamese class special case) — keep lock
  const handleHalfPay = async () => {
    if (sessionId && classType === "Vietnamese Class") {
      clearInterval(intervalRef.current);
      setRunning(false);
      setStatus("awaiting_screenshot");

      try {
        await updateDoc(doc(db, "sessions", sessionId), {
          status: "awaiting_screenshot",
          actualDuration: elapsedSeconds,
          actualEarnings: CLASS_SETTINGS[classType].rate / 2,
          halfPay: true,
          endTime: serverTimestamp(),
        });
      } catch (err) {
        console.warn("handleHalfPay failed:", err);
      }
    }
  };

  // ✅ Upload screenshot with progress — after completion remove lock
  const handleUpload = async () => {
    if (!screenshotFile || !sessionId || !currentUser) return;

    try {
      const filePath = `screenshots/${currentUser.uid}/${Date.now()}_${
        screenshotFile.name
      }`;
      const storageRef = ref(storage, filePath);

      setUploading(true);
      setUploadProgress(0);

      const uploadTask = uploadBytesResumable(storageRef, screenshotFile);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("❌ Upload failed:", error);
          alert("❌ Upload failed. Please try again.");
          setUploading(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            await updateDoc(doc(db, "sessions", sessionId), {
              status: "completed",
              screenshotUrl: downloadURL,
              screenshotName: screenshotFile.name,
              endTime: serverTimestamp(),
            });

            // release the lock now that session is completed
            try {
              await releaseLock();
            } catch (err) {
              console.warn("Failed to release lock after upload:", err);
            }

            // reset local state
            setStatus("completed");
            setClassType("");
            setRunning(false);
            setSessionId(null);
            setElapsedSeconds(0);
            setScreenshotFile(null);
            setUploading(false);

            alert("✅ Screenshot uploaded successfully!");
          } catch (err) {
            console.error("handleUpload finish error:", err);
            alert("❌ Upload finished but failed updating session. Check console.");
            setUploading(false);
          }
        }
      );
    } catch (error) {
      console.error("Upload failed:", error);
      alert("❌ Upload failed. Please try again.");
      setUploading(false);
    }
  };

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <TeacherLayout>
      <Box sx={{ p: 3 }}>
        <Paper
          sx={{
            p: 4,
            borderRadius: 3,
            backdropFilter: "blur(12px)",
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.85), rgba(245,245,245,0.7))",
          }}
        >
          <Typography
            variant="h4"
            mb={4}
            fontWeight="bold"
            align="center"
            sx={{ color: "#333" }}
          >
            🎓 Start a Teaching Session
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 3,
            }}
          >
            {Object.keys(CLASS_SETTINGS).map((key) => {
              const isActive =
                classType === key &&
                (status === "ongoing" || status === "awaiting_screenshot");
              const classConfig = CLASS_SETTINGS[key];

              // compute pointerEvents: if creatingSession disable interactions
              const disabledByCreating = creatingSession;

              return (
                <motion.div
                  key={key}
                  whileHover={!isActive && !disabledByCreating ? { scale: 1.05 } : {}}
                  whileTap={!isActive && !disabledByCreating ? { scale: 0.95 } : {}}
                  onClick={() => {
                    if (!disabledByCreating) handleClassClick(key);
                  }}
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
                      opacity:
                        (creatingSession && !isActive) ||
                        (!isActive && (running || status === "awaiting_screenshot"))
                          ? 0.5
                          : 1,
                      pointerEvents:
                        creatingSession || (!isActive && (running || status === "awaiting_screenshot"))
                          ? "none"
                          : "auto",
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

                          {/* 💰 Cash bag animation with fixed earning */}
                          <motion.div
                            animate={{
                              y: [0, -10, 0],
                              scale: [1, 1.2, 1],
                            }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            style={{ marginTop: "12px" }}
                          >
                            <Typography
                              variant="h5"
                              sx={{
                                fontWeight: "bold",
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              💰 ₱{classConfig.rate}
                            </Typography>
                          </motion.div>

                          <Box
                            sx={{
                              mt: 2,
                              display: "flex",
                              gap: 1,
                              justifyContent: "center",
                            }}
                          >
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
                            Please upload screenshot to complete
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
                              <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 8, borderRadius: 5, mt: 1 }} />
                            </Box>
                          ) : (
                            <Button variant="contained" color="primary" onClick={handleUpload} disabled={!screenshotFile}>
                              Upload Screenshot
                            </Button>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </Box>
        </Paper>
      </Box>

      {/* Custom duration dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            width: "400px",
            maxWidth: "90%",
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: "bold",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
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
              <Select value={selectedMinutes} onChange={(e) => setSelectedMinutes(e.target.value)}>
                {[...Array(13).keys()].map((m) => (
                  <MenuItem key={m * 5} value={m * 5}>
                    {m * 5}
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
          <Button variant="contained" color="primary" onClick={confirmStart} disabled={creatingSession}>
            Start
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm fixed class dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>Start {classType}?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={startFixedClass} disabled={creatingSession}>
            Start
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel confirmation */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)}>
        <DialogTitle>Do you want to cancel this session?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)}>No</Button>
          <Button variant="contained" color="error" onClick={handleCancel}>
            Yes, Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </TeacherLayout>
  );
};

export default StartSession;