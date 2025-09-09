import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend);

const DonutChart = () => {
  const data = {
    labels: ["English", "Math", "Science", "Filipino", "Others"],
    datasets: [
      {
        label: "Subjects",
        data: [12, 8, 6, 4, 3], // You can replace these with real Firebase values later
        backgroundColor: [
          "#00897b", // Teal
          "#26a69a",
          "#4db6ac",
          "#80cbc4",
          "#b2dfdb",
        ],
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    cutout: "60%", // donut thickness
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#333",
          font: {
            size: 14,
          },
        },
      },
    },
  };

  return <Doughnut data={data} options={options} />;
};

export default DonutChart;