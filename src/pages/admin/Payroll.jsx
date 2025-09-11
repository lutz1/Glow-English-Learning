import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Grid,
  Avatar,
  Stack,
  Chip,
  List,
  ListItem,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PaidIcon from "@mui/icons-material/AttachMoney";
import PendingIcon from "@mui/icons-material/HourglassEmpty";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  deleteDoc,
  where,
} from "firebase/firestore";
import AdminLayout from "../../layout/AdminLayout";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Payroll = () => {
  const [sessions, setSessions] = useState([]);
  const [teacherMap, setTeacherMap] = useState({});
  const [teacherViewOpen, setTeacherViewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [teacherSessions, setTeacherSessions] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [capturedReceipt, setCapturedReceipt] = useState(null); // will store base64 data URL
  const [cameraStream, setCameraStream] = useState(null);
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
  const [qrPreviewImg, setQrPreviewImg] = useState(null);
  const videoRef = useRef(null); // for native video element

  // fetch teachers
  const fetchTeachers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const map = {};
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        const teacherId = docSnap.id;
        map[teacherId] = {
          name: data.name || "",
          email: data.email || "",
          photoURL: data.photoURL || "",
          gcashQR: data.gcashQR || null,
        };
      });
      setTeacherMap(map);
    } catch (err) {
      console.error("Error fetching teachers:", err);
    }
  };

  // fetch sessions
  const fetchSessions = async () => {
    try {
      const q = query(collection(db, "sessions"), orderBy("startTime", "desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSessions(list);
    } catch (err) {
      console.error("Error fetching sessions:", err);
    }
  };

  useEffect(() => {
    fetchTeachers();
    fetchSessions();
  }, []);

  // Camera start/stop when dialog opens
  useEffect(() => {
    if (teacherViewOpen) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "user" } })
        .then((stream) => {
          const v = document.getElementById("receiptCamera");
          if (v) {
            v.srcObject = stream;
            v.play().catch(() => {});
          }
          setCameraStream(stream);
        })
        .catch((err) => {
          console.error("Camera error:", err);
          // camera error -> user can upload fallback
        });
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      }
    }

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [teacherViewOpen]);

  const filterByDate = (list, from, to) => {
    if (!from && !to) return list;
    return list.filter((s) => {
      const start = s.startTime?.seconds
        ? new Date(s.startTime.seconds * 1000)
        : null;
      if (!start) return false;
      const fromOk = from ? start >= new Date(from) : true;
      const toOk = to
        ? start <= new Date(new Date(to).setHours(23, 59, 59, 999))
        : true;
      return fromOk && toOk;
    });
  };

  const getTeacherSummary = () => {
    const summary = {};
    sessions.forEach((s) => {
      const teacherInfo = teacherMap[s.teacherId] || {};
      const name = teacherInfo.name || "Unknown";
      const email = teacherInfo.email || "N/A";

      if (!summary[s.teacherId]) {
        summary[s.teacherId] = {
          teacherId: s.teacherId,
          fullName: name,
          email,
          photoURL: teacherInfo.photoURL || "",
          totalEarnings: 0,
          paid: true,
        };
      }
      summary[s.teacherId].totalEarnings += s.totalEarnings || 0;
      if (s.status !== "completed") {
        summary[s.teacherId].paid = false;
      }
    });
    return summary;
  };

  const viewTeacherSessions = (teacherName, teacherId) => {
    setSelectedTeacher(teacherName);
    setSelectedTeacherId(teacherId);
    const filtered = sessions.filter((s) => s.teacherId === teacherId);
    setTeacherSessions(filtered);
    setTeacherViewOpen(true);
  };

  const handleDeleteConfirm = (teacherId, teacherName) => {
    setSelectedTeacher(teacherName);
    setSelectedTeacherId(teacherId);
    setConfirmOpen(true);
  };

  const deleteTeacherSessions = async () => {
    if (!selectedTeacherId) return;
    try {
      const q = query(
        collection(db, "sessions"),
        where("teacherId", "==", selectedTeacherId)
      );
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        await deleteDoc(doc(db, "sessions", docSnap.id));
      }
      fetchSessions();
      setConfirmOpen(false);
    } catch (err) {
      console.error("Error deleting sessions:", err);
      alert("Error deleting sessions. Check console for details.");
    }
  };

  // -----------------------
  // Image helpers
  // -----------------------
  // fetch URL -> dataURL (base64)
  const urlToDataURL = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch image");
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // force any dataURL (png/jpeg) to JPEG dataURL using canvas
  const forceDataURLtoJpeg = (dataUrl, quality = 0.9, maxWidth = 1200) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // resize if width too large
        let { width, height } = img;
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const jpeg = canvas.toDataURL("image/jpeg", quality);
        resolve(jpeg);
      };
      img.onerror = (e) => reject(e);
      img.src = dataUrl;
    });

  // normalize input which may be: dataURL (png/jpeg) or http(s) url
  // returns JPEG dataURL
  // 🔄 Normalize ANY base64 image into JPEG base64 (safe for jsPDF)
const normalizeToJpegDataUrl = (dataUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      try {
        const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.9);
        resolve(jpegDataUrl);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
};

  // -----------------------
  // Capture functions
  // -----------------------
  // capture from the <video> element (native stream)
  const captureReceipt = async () => {
    const video = document.getElementById("receiptCamera");
    if (!video) {
      console.warn("Video element not found");
      return;
    }

    // Create canvas with video dimensions
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Normalize to JPEG and set state
    const base64jpeg = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedReceipt(base64jpeg);
    console.log("Captured from camera (base64):", base64jpeg.substring(0, 50));
  };

  // Capture from a react-webcam-like ref (if you decide to switch)
  const capturePhotoFromRef = (imageSrc) => {
    // if you capture from a library that returns base64 already
    if (!imageSrc) return;
    // ensure JPEG
    if (imageSrc.startsWith("data:image/jpeg")) {
      setCapturedReceipt(imageSrc);
    } else {
      // convert
      forceDataURLtoJpeg(imageSrc).then((jpeg) => {
        setCapturedReceipt(jpeg);
      });
    }
  };

  // Upload handler: convert uploaded file to JPEG base64
  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      // convert to JPEG via canvas to normalize
      forceDataURLtoJpeg(src)
        .then((jpeg) => {
          setCapturedReceipt(jpeg);
          console.log("Uploaded receipt stored as base64:", jpeg.substring(0, 50));
        })
        .catch((err) => {
          console.error("Error converting upload to JPEG:", err);
          alert("Failed to process uploaded image. Try another file.");
        });
    };
    reader.readAsDataURL(file);
  };

  // -----------------------
  // PDF generation
  // -----------------------
  const generateTeacherPDF = async () => {
    if (!selectedTeacherId) {
      alert("No teacher selected");
      return;
    }
    const teacher = teacherMap[selectedTeacherId];
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(`Payroll Report - ${teacher?.name || "Teacher"}`, 20, 20);

    const totalAmount = filterByDate(teacherSessions, dateFrom, dateTo)
      .reduce((sum, s) => sum + (s.totalEarnings || 0), 0)
      .toFixed(2);
    doc.setFontSize(12);
    doc.text(`Total Amount: ₱${totalAmount}`, 20, 30);

    // QR: teacher.gcashQR might be a dataURL or URL. Convert to base64 if needed and detect type.
    if (teacher?.gcashQR) {
      try {
        let qrData = teacher.gcashQR;
        if (typeof qrData === "string" && qrData.startsWith("http")) {
          qrData = await urlToDataURL(qrData); // could be PNG or JPEG
        }
        // we can add QR as PNG if it's png, else JPEG
        if (qrData.startsWith("data:image/png")) {
          doc.text("GCash QR:", 20, 40);
          doc.addImage(qrData, "PNG", 20, 45, 60, 60);
        } else {
          // force to jpeg just in case
          const qrJpeg = await normalizeToJpegDataUrl(qrData);
          doc.text("GCash QR:", 20, 40);
          doc.addImage(qrJpeg, "JPEG", 20, 45, 60, 60);
        }
      } catch (err) {
        console.warn("Failed to attach QR to PDF:", err);
      }
    }

    // Receipt: must exist (you enforced earlier), convert/normalize to jpeg dataurl and insert
    if (capturedReceipt) {
      try {
        console.log("capturedReceipt start:", capturedReceipt.substring(0, 30));
        const receiptJpeg = await normalizeToJpegDataUrl(capturedReceipt);
        // place receipt on PDF (scale to fit — maintain aspect)
        const pageWidth = doc.internal.pageSize.getWidth();
        const maxImgWidth = 100; // mm
        const maxImgHeight = 120;
        // Insert with specified size (you may adjust)
        doc.text("Receipt Proof:", 100, 50);
        doc.addImage(receiptJpeg, "JPEG", 100, 55, 60, 60);
      } catch (err) {
        console.error("Failed to attach receipt to PDF:", err);
        alert("Failed to add receipt to PDF. Check console for details.");
        return;
      }
    }

    doc.save(`${teacher?.name || "teacher"}_payroll.pdf`);
    // ✅ After generating payroll, mark sessions as paid
  try {
    const q = query(
      collection(db, "sessions"),
      where("teacherId", "==", selectedTeacherId)
    );
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      await updateDoc(doc(db, "sessions", docSnap.id), {
        status: "paid",
      });
    }

    // refresh list + close dialog
    await fetchSessions();
    setTeacherViewOpen(false);
  } catch (err) {
    console.error("Error marking sessions as paid:", err);
    alert("⚠️ Payroll PDF saved, but failed to update status.");
  }
};

  // Summary data & totals
  const summaryData = getTeacherSummary();
  const totalPayrollPaid = Object.values(summaryData).reduce(
    (sum, d) => sum + d.totalEarnings,
    0
  );
  const numberPendingPayroll = Object.values(summaryData).filter((d) => !d.paid).length;

  const glassCard = {
    background: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(18px)",
    borderRadius: "18px",
    boxShadow: "0 16px 32px rgba(0,0,0,0.5)",
    color: "#fff",
  };

  return (
    <AdminLayout>
      <Box
        sx={{
          p: 3,
          minHeight: "100vh",
          background: "linear-gradient(160deg, #2c3e50, #34495e, #2c3e50)",
          color: "#fff",
        }}
      >
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Payroll Management
        </Typography>

        {/* Totals */}
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} md={6}>
            <Card sx={glassCard}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: "#fff", color: "success.main" }}>
                    <PaidIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2">Total Payroll</Typography>
                    <Typography variant="h5">₱{totalPayrollPaid.toFixed(2)}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={glassCard}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: "#fff", color: "error.main" }}>
                    <PendingIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2">Pending Payroll</Typography>
                    <Typography variant="h5">{numberPendingPayroll}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Teacher Summary */}
        <Card sx={glassCard}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", color: "#64b5f6" }}>
              👩‍🏫 Teacher Payroll
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr",
                p: 1.5,
                borderRadius: "10px",
                mb: 1,
                fontWeight: "bold",
                bgcolor: "rgba(255,255,255,0.12)",
                textAlign: "center",
              }}
            >
              <Typography>👩‍🏫 Teacher</Typography>
              <Typography>💰 Earnings</Typography>
              <Typography>📌 Status</Typography>
              <Typography>👀 Action</Typography>
              <Typography>🗑 Delete</Typography>
            </Box>

            <List>
              {Object.entries(summaryData).map(([id, data]) => {
                const teacherInfo = teacherMap[data.teacherId] || {};
                return (
                  <ListItem
                    key={id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr",
                      alignItems: "center",
                      gap: 2,
                      mb: 1,
                      p: 2,
                      borderRadius: "12px",
                      bgcolor: "rgba(255,255,255,0.05)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                      textAlign: "center",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Avatar src={teacherInfo.photoURL || ""} />
                      <Box sx={{ textAlign: "left" }}>
                        <Typography sx={{ fontWeight: "bold" }}>{teacherInfo.name || "Unknown"}</Typography>
                        <Typography sx={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>
                          {teacherInfo.email || data.email}
                        </Typography>
                      </Box>
                    </Box>

                    <Typography sx={{ fontWeight: "bold", color: "#81c784" }}>
                      ₱{data.totalEarnings.toFixed(2)}
                    </Typography>

                    <Chip label={data.paid ? "Paid" : "Pending"} color={data.paid ? "success" : "warning"} size="small" />

                    <Tooltip title="View Sessions">
                      <IconButton
                        sx={{ color: "#64b5f6", "&:hover": { bgcolor: "rgba(100,181,246,0.15)" } }}
                        onClick={() => viewTeacherSessions(teacherInfo.name, data.teacherId)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Delete Teacher">
                      <IconButton
                        color="error"
                        sx={{ "&:hover": { bgcolor: "rgba(244,67,54,0.15)" } }}
                        onClick={() => handleDeleteConfirm(data.teacherId, teacherInfo.name)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItem>
                );
              })}
            </List>
          </CardContent>
        </Card>

        {/* Confirm Delete */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            Are you sure you want to delete all sessions for <strong>{selectedTeacher}</strong>?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={deleteTeacherSessions} color="error" variant="contained">
              Yes, Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Teacher Sessions Dialog */}
        <Dialog
          open={teacherViewOpen}
          onClose={() => setTeacherViewOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "16px",
              bgcolor: "background.default",
              color: "text.primary",
            },
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar src={teacherMap[selectedTeacherId]?.photoURL || ""} sx={{ width: 48, height: 48 }} />
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {teacherMap[selectedTeacherId]?.name || selectedTeacher}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {teacherMap[selectedTeacherId]?.email || "No email"}
                </Typography>
              </Box>
            </Box>
          </DialogTitle>

          <DialogContent dividers sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2} mb={3}>
              <TextField type="date" label="From" InputLabelProps={{ shrink: true }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} fullWidth />
              <TextField type="date" label="To" InputLabelProps={{ shrink: true }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} fullWidth />
            </Stack>

            <Stack spacing={2}>
              {filterByDate(teacherSessions, dateFrom, dateTo).map((s) => (
                <Card
                  key={s.id}
                  sx={{
                    p: 2,
                    borderRadius: "12px",
                    bgcolor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.06)" },
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <Typography variant="body2" color="text.secondary">
                        {s.startTime ? new Date(s.startTime.seconds * 1000).toLocaleDateString() : ""}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.startTime ? new Date(s.startTime.seconds * 1000).toLocaleTimeString() : ""}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <Typography fontWeight="bold">{s.classType}</Typography>
                      <Chip label={s.status} color={s.status === "completed" ? "success" : "warning"} size="small" sx={{ mt: 0.5 }} />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <Typography color="success.main" fontWeight="bold">
                        ₱{s.totalEarnings}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.actualDuration} mins
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={2} textAlign="right">
                      {s.screenshotUrl && (
                        <Button size="small" variant="outlined" onClick={() => setSelectedScreenshot(s.screenshotUrl)}>
                          Screenshot
                        </Button>
                      )}
                    </Grid>
                  </Grid>
                </Card>
              ))}
            </Stack>

            <Box sx={{ mt: 3, textAlign: "right" }}>
              <Typography variant="h6" fontWeight="bold">
                Total Amount: ₱
                {filterByDate(teacherSessions, dateFrom, dateTo).reduce((sum, s) => sum + (s.totalEarnings || 0), 0).toFixed(2)}
              </Typography>
            </Box>

            {/* QR + Camera Section */}
            <Card
              sx={{
                mt: 3,
                borderRadius: "18px",
                boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(12px)",
                p: 3,
              }}
            >
              <Grid container spacing={3} alignItems="flex-start">
                {/* QR Code */}
                {teacherMap[selectedTeacherId]?.gcashQR && (
                  <Grid item xs={12} md={6}>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: "bold", color: "#64b5f6" }}>
                        GCash QR
                      </Typography>
                      <Tooltip title="Click to enlarge">
                        <img
                          src={teacherMap[selectedTeacherId]?.gcashQR}
                          alt="GCash QR"
                          onClick={() => {
                            setQrPreviewImg(teacherMap[selectedTeacherId]?.gcashQR);
                            setQrPreviewOpen(true);
                          }}
                          style={{
                            width: "180px",
                            height: "180px",
                            borderRadius: "16px",
                            border: "2px solid #eee",
                            cursor: "pointer",
                            boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
                            transition: "transform 0.2s",
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                          onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        />
                      </Tooltip>
                    </Box>
                  </Grid>
                )}

                {/* Camera */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: "bold", color: "#1b5e20" }}>
                      Upload Receipt
                    </Typography>
                    <Box
                      sx={{
                        position: "relative",
                        display: "inline-block",
                        borderRadius: "16px",
                        overflow: "hidden",
                        boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
                      }}
                    >
                      <video
                        id="receiptCamera"
                        ref={videoRef}
                        autoPlay
                        playsInline
                        style={{
                          width: "260px",
                          height: "200px",
                          borderRadius: "16px",
                          objectFit: "cover",
                        }}
                      />

                      {/* Corner indicators */}
                      {["topLeft", "topRight", "bottomLeft", "bottomRight"].map((pos) => (
                        <Box
                          key={pos}
                          sx={{
                            position: "absolute",
                            width: 20,
                            height: 20,
                            border: "3px solid #64b5f6",
                            ...(pos === "topLeft" && { top: 8, left: 8, borderRight: "none", borderBottom: "none" }),
                            ...(pos === "topRight" && { top: 8, right: 8, borderLeft: "none", borderBottom: "none" }),
                            ...(pos === "bottomLeft" && { bottom: 8, left: 8, borderRight: "none", borderTop: "none" }),
                            ...(pos === "bottomRight" && { bottom: 8, right: 8, borderLeft: "none", borderTop: "none" }),
                          }}
                        />
                      ))}

                      {/* Capture button inside video */}
                      <Button
                        onClick={captureReceipt}
                        variant="contained"
                        sx={{
                          position: "absolute",
                          bottom: 10,
                          left: "50%",
                          transform: "translateX(-50%)",
                          borderRadius: "50%",
                          width: 50,
                          height: 50,
                          minWidth: 0,
                          bgcolor: "#64b5f6",
                          "&:hover": { bgcolor: "#42a5f5" },
                        }}
                      >
                        ⬤
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              </Grid>

              {/* Captured Receipt -> shown below card */}
              {capturedReceipt && (
                <Box sx={{ mt: 3, textAlign: "center" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: "#000", mb: 1 }}>
                    Captured Receipt
                  </Typography>

                  <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <img
                      src={capturedReceipt}
                      alt="Receipt"
                      style={{
                        width: "100%",
                        maxWidth: "400px",
                        borderRadius: "16px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                      }}
                    />
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Button variant="outlined" color="error" onClick={() => setCapturedReceipt(null)} sx={{ borderRadius: "12px" }}>
                      Retake
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Upload fallback for GCash receipt */}
              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold", color: "#000" }}>
                  Or Upload GCash Receipt
                </Typography>
                <Button variant="outlined" component="label" sx={{ borderRadius: "12px" }}>
                  Upload Receipt
                  <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                </Button>
              </Box>
            </Card>
          </DialogContent>

          {/* Actions */}
          <DialogActions>
            <Button
              variant="contained"
              color="primary"
              sx={{ borderRadius: "12px", px: 4, py: 1.5, fontWeight: "bold" }}
              onClick={async () => {
                if (!capturedReceipt) {
                  alert("⚠️ Please capture or upload a GCash receipt before generating payroll.");
                  return;
                }
                await generateTeacherPDF(); // this now marks sessions as paid + closes dialog
              }}
            >
              Generate Payroll
            </Button>
          </DialogActions>
        </Dialog>

        {/* QR Preview Dialog */}
        <Dialog
          open={qrPreviewOpen}
          onClose={() => setQrPreviewOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: "20px",
              p: 2,
              textAlign: "center",
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: "bold", color: "#64b5f6" }}>Scan QR Code</DialogTitle>

          {/* Total Amount */}
          <Typography
            variant="subtitle1"
            sx={{
              fontSize: "20px",
              mb: 2,
              fontWeight: "bold",
              color: "#000",
              fontFamily: "'Roboto Mono', 'Courier New', monospace",
              letterSpacing: "0.5px",
            }}
          >
            Total Amount: ₱
            {filterByDate(teacherSessions, dateFrom, dateTo).reduce((sum, s) => sum + (s.totalEarnings || 0), 0).toFixed(2)}
          </Typography>

          <DialogContent>
            {qrPreviewImg && (
              <img
                src={qrPreviewImg}
                alt="QR Preview"
                style={{
                  width: "100%",
                  maxWidth: "350px",
                  borderRadius: "16px",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
                }}
              />
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setQrPreviewOpen(false)} variant="contained">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
};

export default Payroll;