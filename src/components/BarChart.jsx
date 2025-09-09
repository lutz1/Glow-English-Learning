import React from "react";
import { Bar } from "react-chartjs-2";
import { Paper, Typography } from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const data = {
  labels: ["Math", "English", "Science", "History"],
  datasets: [
    {
      label: "Performance",
      data: [85, 90, 78, 88],
      backgroundColor: "#14b8a6",
    },
  ],
};

const options = {
  responsive: true,
  plugins: {
    legend: {
      position: "top",
    },
    title: {
      display: true,
      text: "Teacher Subject Performance",
    },
  },
};

const BarChart = () => {
  return (
    <Paper sx={{ padding: 2 }}>
      <Typography variant="h6" gutterBottom>
        Subject Performance
      </Typography>
      <Bar data={data} options={options} />
    </Paper>
  );
};

export default BarChart;