import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Avatar,
  Stack,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
  List,
  ListItem,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Divider,
} from "@mui/material";
import {
  Add,
  Delete,
  Edit,
  Visibility,
  LockReset,
  Search,
} from "@mui/icons-material";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import {
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { db, auth, secondaryAuth } from "../../firebase";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import Swal from "sweetalert2";

const TeacherList = () => {
  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // dialogs
  const [openProfile, setOpenProfile] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // add/edit form
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    role: "teacher",
    photoURL: "",
    password: "",
  });

  const glassCard = {
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(18px)",
    borderRadius: "18px",
    boxShadow: "0 12px 28px rgba(0,0,0,0.4)",
    color: "#fff",
  };

  const dialogPaper = {
    sx: {
      background: "rgba(20,30,48,0.95)",
      color: "#fff",
      borderRadius: 3,
      border: "1px solid rgba(255,255,255,0.1)",
    },
  };

  // ✅ Fetch teachers
  const fetchTeachers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const data = querySnapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((user) => user.role === "teacher");
      setTeachers(data);
      setFilteredTeachers(data);
    } catch (err) {
      console.error("Fetch teachers error:", err);
      Swal.fire("Error", "Cannot fetch teachers. Check permissions.", "error");
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  // ✅ Search Filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTeachers(teachers);
    } else {
      const lower = searchQuery.toLowerCase();
      setFilteredTeachers(
        teachers.filter(
          (t) =>
            t.name?.toLowerCase().includes(lower) ||
            t.email?.toLowerCase().includes(lower)
        )
      );
    }
  }, [searchQuery, teachers]);

  // ✅ Delete Teacher
  const handleDelete = async (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, "users", id));
          fetchTeachers();
          Swal.fire({ icon: "success", title: "Deleted!", timer: 1500 });
        } catch (err) {
          Swal.fire("Error", err.message, "error");
        }
      }
    });
  };

  // ✅ Reset Password
  const handleResetPassword = async (teacher) => {
    try {
      await sendPasswordResetEmail(auth, teacher.email);
      Swal.fire({
        icon: "success",
        title: "Password Reset Email Sent",
        text: `An email was sent to ${teacher.email}`,
        timer: 3000,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    }
  };

  // ✅ View profile dialog
  const handleOpenProfile = (teacher) => {
    setSelectedTeacher(teacher);
    setOpenProfile(true);
  };
  const handleCloseProfile = () => {
    setSelectedTeacher(null);
    setOpenProfile(false);
  };

  // ✅ Add/Edit dialog
  const handleOpenForm = (teacher = null) => {
    if (teacher) {
      setSelectedTeacher(teacher);
      setForm({
        name: teacher.name || "",
        email: teacher.email || "",
        phone: teacher.phone || "",
        gender: teacher.gender || "",
        role: teacher.role || "teacher",
        photoURL: teacher.photoURL || "",
        password: "",
      });
    } else {
      setSelectedTeacher(null);
      setForm({
        name: "",
        email: "",
        phone: "",
        gender: "",
        role: "teacher",
        photoURL: "",
        password: "",
      });
    }
    setOpenForm(true);
  };
  const handleCloseForm = () => {
    setOpenForm(false);
    setSelectedTeacher(null);
  };

  // ✅ Submit Add/Update
  const handleSubmit = async () => {
    try {
      if (!form.name || !form.email) {
        Swal.fire("Error", "Please fill required fields (name & email).", "error");
        return;
      }

      if (selectedTeacher) {
        // Update existing
        const ref = doc(db, "users", selectedTeacher.id);
        const updateData = {
          name: form.name,
          phone: form.phone,
          gender: form.gender,
          role: form.role || "teacher",
          photoURL: form.photoURL,
          // email stays as-is (editing auth email would need extra flows)
          email: selectedTeacher.email,
        };
        await updateDoc(ref, updateData);
        Swal.fire({ icon: "success", title: "Teacher updated!", timer: 1500 });
      } else {
        // Create new (Auth + Firestore)
        if (!form.password || form.password.length < 6) {
          Swal.fire("Error", "Password must be at least 6 characters.", "error");
          return;
        }
        const cred = await createUserWithEmailAndPassword(
          secondaryAuth,
          form.email,
          form.password
        );
        const teacherData = {
          uid: cred.user.uid,
          name: form.name,
          email: form.email,
          phone: form.phone || "",
          gender: form.gender || "",
          role: form.role || "teacher",
          createdAt: new Date(),
          photoURL: form.photoURL || "",
        };
        await setDoc(doc(db, "users", cred.user.uid), teacherData);
        await signOut(secondaryAuth);
        Swal.fire({ icon: "success", title: "Teacher added!", timer: 1500 });
      }

      handleCloseForm();
      fetchTeachers();
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    }
  };

  return (
    <Box display="flex">
      <Sidebar />
      <Box flexGrow={1}>
        <Topbar />
        <Box
          sx={{
            p: 3,
            minHeight: "100vh",
            background: "linear-gradient(160deg, #2c3e50, #34495e, #2c3e50)",
            color: "#fff",
          }}
        >
          <Card sx={{ ...glassCard }}>
            <CardContent>
              {/* Header & Actions */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  variant="h5"
                  sx={{ fontWeight: "bold", color: "#64b5f6" }}
                >
                  👨‍🏫 Teacher List
                </Typography>
                <Stack direction="row" spacing={2}>
                  <TextField
                    placeholder="Search teachers..."
                    variant="outlined"
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search sx={{ color: "#90caf9" }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      minWidth: 280,
                      bgcolor: "rgba(255,255,255,0.1)",
                      borderRadius: 2,
                      input: { color: "#fff" },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(255,255,255,0.2)",
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenForm(null)}
                  >
                    Add Teacher
                  </Button>
                </Stack>
              </Box>

              {/* Table Header */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1.5fr",
                  p: 1.5,
                  borderRadius: "10px",
                  mb: 1,
                  fontWeight: "bold",
                  bgcolor: "rgba(255,255,255,0.12)",
                }}
              >
                {["Name", "Email", "Phone", "Gender", "Role", "Actions"].map((header, i, arr) => (
                  <Typography
                    key={header}
                    sx={{
                      px: 1,
                      borderRight: i !== arr.length - 1 ? "1px solid rgba(255,255,255,0.2)" : "none",
                    }}
                  >
                    {header}
                  </Typography>
                ))}
              </Box>

              {/* Scrollable List */}
              <List sx={{ maxHeight: 500, overflow: "auto" }}>
                {filteredTeachers.length === 0 && (
                  <Box
                    sx={{
                      p: 4,
                      textAlign: "center",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    No teachers found.
                  </Box>
                )}

                {filteredTeachers.map((t) => (
                  <ListItem
                    key={t.id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1.5fr",
                      alignItems: "center",
                      p: 1.5,
                      mb: 1,
                      borderRadius: "12px",
                      bgcolor: "rgba(15, 15, 15, 0.06)",
                      "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                    }}
                  >
                    {/* Name + Avatar */}
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar
                        src={t.photoURL || ""}
                        alt={t.name}
                        sx={{ width: 40, height: 40 }}
                      >
                        {t.name ? t.name[0] : "T"}
                      </Avatar>
                      <Typography sx={{ fontWeight: "bold", color: "#fff" }}>
                        {t.name}
                      </Typography>
                    </Stack>

                    {/* Email */}
                    <Typography sx={{ color: "rgba(255,255,255,0.8)" }}>
                      {t.email}
                    </Typography>

                    {/* Phone */}
                    <Typography sx={{ color: "#fff" }}>
                      {t.phone || "—"}
                    </Typography>

                    {/* Gender */}
                    <Chip
                      label={t.gender || "N/A"}
                      size="small"
                      sx={{ bgcolor: "#ab47bc", color: "#fff", fontWeight: "bold" }}
                    />

                    {/* Role */}
                    <Chip
                      label={t.role || "teacher"}
                      size="small"
                      sx={{ bgcolor: "#66bb6a", color: "#fff", fontWeight: "bold" }}
                    />

                    {/* Actions */}
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="View Teacher">
                        <IconButton
                          onClick={() => handleOpenProfile(t)}
                          sx={{
                            color: "#64b5f6", // soft blue
                            "&:hover": { color: "#90caf9" },
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Edit Teacher">
                        <IconButton
                          onClick={() => handleOpenForm(t)}
                          sx={{
                            color: "#ffb74d", // warm amber
                            "&:hover": { color: "#ffcc80" },
                          }}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Delete Teacher">
                        <IconButton
                          onClick={() => handleDelete(t.id)}
                          sx={{
                            color: "#e57373", // soft red
                            "&:hover": { color: "#ef9a9a" },
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Reset Password">
                        <IconButton
                          onClick={() => handleResetPassword(t)}
                          sx={{
                            color: "#4db6ac", // teal (less harsh than purple/red)
                            "&:hover": { color: "#80cbc4" },
                          }}
                        >
                          <LockReset />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* VIEW PROFILE DIALOG */}
      <Dialog open={openProfile} onClose={handleCloseProfile} PaperProps={dialogPaper} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Teacher Profile</DialogTitle>
        <DialogContent dividers sx={{ borderColor: "rgba(255,255,255,0.1)" }}>
          {selectedTeacher && (
            <Box>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Avatar
                  src={selectedTeacher.photoURL || ""}
                  alt={selectedTeacher.name}
                  sx={{ width: 64, height: 64 }}
                >
                  {selectedTeacher.name ? selectedTeacher.name[0] : "T"}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    {selectedTeacher.name}
                  </Typography>
                  <Typography sx={{ color: "rgba(255,255,255,0.8)" }}>
                    {selectedTeacher.email}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ mb: 2, borderColor: "rgba(255,255,255,0.1)" }} />

              <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
                <Chip
                  label={`Phone: ${selectedTeacher.phone || "—"}`}
                  sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff" }}
                />
                <Chip
                  label={`Gender: ${selectedTeacher.gender || "N/A"}`}
                  sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff" }}
                />
                <Chip
                  label={`Role: ${selectedTeacher.role || "teacher"}`}
                  sx={{ bgcolor: "rgba(255,255,255,0.12)", color: "#fff" }}
                />
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            color="secondary"
            startIcon={<LockReset />}
            onClick={() => selectedTeacher && handleResetPassword(selectedTeacher)}
          >
            Reset Password
          </Button>
          <Button
            color="warning"
            startIcon={<Edit />}
            onClick={() => {
              handleCloseProfile();
              handleOpenForm(selectedTeacher);
            }}
          >
            Edit
          </Button>
          <Button onClick={handleCloseProfile} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ADD/EDIT FORM DIALOG */}
<Dialog
  open={openForm}
  onClose={handleCloseForm}
  PaperProps={dialogPaper}
  fullWidth
  maxWidth="sm"
>
  <DialogTitle
    sx={{
      fontWeight: 700,
      color: "#64b5f6", // soft blue title
      pb: 1,
    }}
  >
    {selectedTeacher ? "✏️ Edit Teacher" : "➕ Add Teacher"}
  </DialogTitle>

  <DialogContent
    dividers
    sx={{
      borderColor: "rgba(255,255,255,0.1)",
      background: "rgba(30,30,40,0.9)",
    }}
  >
    <Stack spacing={2} sx={{ mt: 1 }}>
      <TextField
        label="Full Name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        fullWidth
        InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
        InputProps={{
          style: { color: "#fff" },
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
            "&:hover fieldset": { borderColor: "#64b5f6" },
            "&.Mui-focused fieldset": { borderColor: "#64b5f6" },
          },
        }}
      />

      <TextField
  label="Email"
  value={form.email}
  onChange={(e) => setForm({ ...form, email: e.target.value })}
  fullWidth
  disabled={!!selectedTeacher}
  InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
  InputProps={{
    style: { color: "#fff" }, // normal text color
  }}
  sx={{
    "& .MuiOutlinedInput-root": {
      "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
      "&:hover fieldset": { borderColor: "#64b5f6" },
      "&.Mui-focused fieldset": { borderColor: "#64b5f6" },
      "&.Mui-disabled": {
        "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
        "& input": {
          color: "rgba(255,255,255,0.6)", // make disabled text readable
          WebkitTextFillColor: "rgba(255,255,255,0.6)", // fix for Chrome autofill
        },
      },
    },
  }}
/>

      <TextField
        label="Phone"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        fullWidth
        InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
        InputProps={{
          style: { color: "#fff" },
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
            "&:hover fieldset": { borderColor: "#64b5f6" },
            "&.Mui-focused fieldset": { borderColor: "#64b5f6" },
          },
        }}
      />

      <TextField
        label="Gender"
        value={form.gender}
        onChange={(e) => setForm({ ...form, gender: e.target.value })}
        select
        fullWidth
        InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
        InputProps={{
          style: { color: "#fff" },
        }}
        sx={{
          "& .MuiOutlinedInput-root": {
            "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
            "&:hover fieldset": { borderColor: "#64b5f6" },
            "&.Mui-focused fieldset": { borderColor: "#64b5f6" },
          },
        }}
      >
        <MenuItem value="male">Male</MenuItem>
        <MenuItem value="female">Female</MenuItem>
        <MenuItem value="other">Other</MenuItem>
      </TextField>

      {/* Only show password field when adding */}
      {!selectedTeacher && (
        <TextField
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          fullWidth
          InputLabelProps={{ style: { color: "rgba(255,255,255,0.7)" } }}
          InputProps={{
            style: { color: "#fff" },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "rgba(255,255,255,0.2)" },
              "&:hover fieldset": { borderColor: "#64b5f6" },
              "&.Mui-focused fieldset": { borderColor: "#64b5f6" },
            },
          }}
        />
      )}
    </Stack>
  </DialogContent>

  <DialogActions sx={{ px: 3, py: 2 }}>
    <Button
      onClick={handleCloseForm}
      sx={{
        color: "#e57373",
        "&:hover": { backgroundColor: "rgba(229,115,115,0.1)" },
      }}
    >
      Cancel
    </Button>
    <Button
      onClick={handleSubmit}
      variant="contained"
      sx={{
        bgcolor: "#64b5f6",
        fontWeight: "bold",
        px: 3,
        "&:hover": { bgcolor: "#90caf9" },
      }}
    >
      {selectedTeacher ? "Update" : "Add"}
    </Button>
  </DialogActions>
</Dialog>
    </Box>
  );
};

export default TeacherList;