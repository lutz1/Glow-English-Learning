import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Card,
  CardContent,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PaidIcon from "@mui/icons-material/AttachMoney";
import PendingIcon from "@mui/icons-material/HourglassEmpty";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  updateDoc,
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
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [teacherViewOpen, setTeacherViewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [teacherSessions, setTeacherSessions] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateFromSummary, setDateFromSummary] = useState("");
  const [dateToSummary, setDateToSummary] = useState("");

  useEffect(() => {
    fetchTeachers();
    fetchSessions();
  }, []);

  const fetchTeachers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const map = {};
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        map[docSnap.id] = {
          fullName: data.fullName || "",
          email: data.email || "",
        };
      });
      setTeacherMap(map);
    } catch (err) {
      console.error("Error fetching teachers:", err);
    }
  };

  const fetchSessions = async () => {
    try {
      const q = query(collection(db, "sessions"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSessions(list);
    } catch (err) {
      console.error("Error fetching sessions:", err);
    }
  };

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
    const filteredSessions = filterByDate(
      sessions,
      dateFromSummary,
      dateToSummary
    );

    filteredSessions.forEach((s) => {
      const teacherInfo =
        teacherMap[s.teacherId] ||
        Object.values(teacherMap).find((t) => t.email === s.teacherEmail) ||
        {};
      const name = teacherInfo.fullName || s.teacherName || "Unknown";

      if (!summary[name]) {
        summary[name] = {
          teacherId: s.teacherId || null,
          totalEarnings: 0,
          email: teacherInfo.email || s.teacherEmail || "",
          paid: true,
        };
      }
      summary[name].totalEarnings += s.totalEarnings || 0;
      if (!s.paid) {
        summary[name].paid = false;
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

  const generateTeacherPDF = async () => {
    const filtered = filterByDate(teacherSessions, dateFrom, dateTo);
    if (filtered.length === 0) {
      alert("No sessions found for this date range.");
      return;
    }

    const docPDF = new jsPDF("p", "mm", "a4");
    docPDF.setFontSize(16);
    docPDF.text(`Payroll Report - ${selectedTeacher}`, 14, 16);
    if (dateFrom || dateTo) {
      docPDF.setFontSize(10);
      docPDF.text(
        `Date Range: ${dateFrom || "Any"} - ${dateTo || "Any"}`,
        14,
        22
      );
    }

    const tableColumn = [
      "Date",
      "Class Type",
      "Rate",
      "Start",
      "End",
      "Duration",
      "Earnings",
      "Status",
    ];
    const tableRows = [];

    let totalAmount = 0;

    filtered.forEach((s) => {
      tableRows.push([
        s.startTime
          ? new Date(s.startTime.seconds * 1000).toLocaleDateString()
          : "",
        s.classType,
        `₱${s.rate}`,
        s.startTime
          ? new Date(s.startTime.seconds * 1000).toLocaleTimeString()
          : "",
        s.endTime
          ? new Date(s.endTime.seconds * 1000).toLocaleTimeString()
          : "",
        `${s.durationMinutes}m ${s.durationSeconds % 60}s`,
        `₱${s.totalEarnings}`,
        s.paid ? "Paid" : "Pending",
      ]);
      totalAmount += s.totalEarnings || 0;
    });

    tableRows.push([
      "",
      "",
      "",
      "",
      "",
      "Total",
      `₱${totalAmount.toFixed(2)}`,
      "",
    ]);

    autoTable(docPDF, {
      head: [tableColumn],
      body: tableRows,
      startY: dateFrom || dateTo ? 28 : 24,
    });

    docPDF.save(`${selectedTeacher}_payroll.pdf`);

    // 🔹 Mark unpaid sessions as Paid
    for (const s of filtered) {
      if (!s.paid) {
        try {
          await updateDoc(doc(db, "sessions", s.id), { paid: true });
        } catch (err) {
          console.error("Error marking paid:", err);
        }
      }
    }

    fetchSessions();
  };

  const generateSummaryPDF = () => {
    const docPDF = new jsPDF("p", "mm", "a4");
    docPDF.setFontSize(16);
    const dateRangeLabel =
      dateFromSummary || dateToSummary
        ? `${dateFromSummary || "Start"} to ${dateToSummary || "Today"}`
        : "All Dates";
    docPDF.text(`Payroll Summary - ${dateRangeLabel}`, 14, 16);

    const tableColumn = ["Teacher", "Email", "Total Earnings", "Status"];
    const tableRows = [];

    let grandTotal = 0;

    Object.entries(summaryData).forEach(([name, data]) => {
      tableRows.push([
        name,
        data.email,
        `₱${data.totalEarnings.toFixed(2)}`,
        data.paid ? "Paid" : "Pending",
      ]);
      grandTotal += data.totalEarnings;
    });

    tableRows.push(["", "GRAND TOTAL", `₱${grandTotal.toFixed(2)}`, ""]);

    autoTable(docPDF, {
      head: [tableColumn],
      body: tableRows,
      startY: 24,
    });

    docPDF.save(`Payroll_Summary_${dateRangeLabel}.pdf`);
  };

  const summaryData = getTeacherSummary();

  // 🔹 Totals
  const totalPaid = Object.values(summaryData)
    .filter((d) => d.paid)
    .reduce((sum, d) => sum + d.totalEarnings, 0);

  const totalPending = Object.values(summaryData)
    .filter((d) => !d.paid)
    .reduce((sum, d) => sum + d.totalEarnings, 0);

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Payroll
        </Typography>

        {/* 🔹 Totals as Cards with Icons */}
        <Box sx={{ display: "flex", gap: 3, mb: 3 }}>
          <Card sx={{ flex: 1, bgcolor: "success.light", color: "white" }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <PaidIcon fontSize="large" />
              <Box>
                <Typography variant="subtitle2">Total Paid</Typography>
                <Typography variant="h5">
                  ₱{totalPaid.toFixed(2)}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1, bgcolor: "error.light", color: "white" }}>
            <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <PendingIcon fontSize="large" />
              <Box>
                <Typography variant="subtitle2">Total Pending</Typography>
                <Typography variant="h5">
                  ₱{totalPending.toFixed(2)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Button
          variant="contained"
          color="secondary"
          onClick={() => setSummaryOpen(true)}
          sx={{ mb: 2, mr: 2 }}
        >
          View Payroll Summary
        </Button>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Teacher</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(summaryData).map(([name, data]) => (
                <TableRow key={name}>
                  <TableCell>{name}</TableCell>
                  <TableCell>{data.email}</TableCell>
                  <TableCell>{data.paid ? "Paid" : "Pending"}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => viewTeacherSessions(name, data.teacherId)}
                      sx={{ mr: 1 }}
                    >
                      View
                    </Button>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteConfirm(data.teacherId, name)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Confirm Delete */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            Are you sure you want to delete all sessions for{" "}
            <strong>{selectedTeacher}</strong>?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={deleteTeacherSessions} color="error" variant="contained">
              Yes, Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Payroll Summary */}
        <Dialog
          open={summaryOpen}
          onClose={() => setSummaryOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Payroll Summary</DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                type="date"
                label="From"
                InputLabelProps={{ shrink: true }}
                value={dateFromSummary}
                onChange={(e) => setDateFromSummary(e.target.value)}
              />
              <TextField
                type="date"
                label="To"
                InputLabelProps={{ shrink: true }}
                value={dateToSummary}
                onChange={(e) => setDateToSummary(e.target.value)}
              />
            </Box>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Teacher</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Total Earnings</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(summaryData).map(([name, data]) => (
                  <TableRow key={name}>
                    <TableCell>{name}</TableCell>
                    <TableCell>{data.email}</TableCell>
                    <TableCell>₱{data.totalEarnings.toFixed(2)}</TableCell>
                    <TableCell>{data.paid ? "Paid" : "Pending"}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ backgroundColor: "#f5f5f5", fontWeight: "bold" }}>
                  <TableCell colSpan={2} align="right">
                    Grand Total:
                  </TableCell>
                  <TableCell colSpan={2}>
                    ₱
                    {Object.values(summaryData)
                      .reduce((sum, teacher) => sum + teacher.totalEarnings, 0)
                      .toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={generateSummaryPDF} color="primary">
              Download PDF
            </Button>
            <Button onClick={() => setSummaryOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Teacher Sessions */}
        <Dialog
          open={teacherViewOpen}
          onClose={() => setTeacherViewOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>{selectedTeacher} - Class History</DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                type="date"
                label="From"
                InputLabelProps={{ shrink: true }}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <TextField
                type="date"
                label="To"
                InputLabelProps={{ shrink: true }}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </Box>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Class Type</TableCell>
                  <TableCell>Rate</TableCell>
                  <TableCell>Start</TableCell>
                  <TableCell>End</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Earnings</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filterByDate(teacherSessions, dateFrom, dateTo).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {s.startTime
                        ? new Date(s.startTime.seconds * 1000).toLocaleDateString()
                        : ""}
                    </TableCell>
                    <TableCell>{s.classType}</TableCell>
                    <TableCell>₱{s.rate}</TableCell>
                    <TableCell>
                      {s.startTime
                        ? new Date(s.startTime.seconds * 1000).toLocaleTimeString()
                        : ""}
                    </TableCell>
                    <TableCell>
                      {s.endTime
                        ? new Date(s.endTime.seconds * 1000).toLocaleTimeString()
                        : ""}
                    </TableCell>
                    <TableCell>
                      {s.durationMinutes}m {s.durationSeconds % 60}s
                    </TableCell>
                    <TableCell>₱{s.totalEarnings}</TableCell>
                    <TableCell>{s.paid ? "Paid" : "Pending"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Total */}
            <Box sx={{ mt: 2, textAlign: "right", fontWeight: "bold" }}>
              Total Amount: ₱
              {filterByDate(teacherSessions, dateFrom, dateTo)
                .reduce((sum, s) => sum + (s.totalEarnings || 0), 0)
                .toFixed(2)}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={generateTeacherPDF} color="primary">
              Generate Payroll & Mark Paid
            </Button>
            <Button onClick={() => setTeacherViewOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </AdminLayout>
  );
};

export default Payroll;