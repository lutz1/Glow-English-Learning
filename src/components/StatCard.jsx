import { Card, CardContent, Typography, Box } from "@mui/material";
import { teal } from "@mui/material/colors";

const StatCard = ({ title, value, icon }) => {
  return (
    <Card
      sx={{
        display: "flex",
        alignItems: "center",
        p: 2,
        borderLeft: `6px solid ${teal[500]}`,
        boxShadow: 3,
      }}
    >
      <Box sx={{ fontSize: 40, color: teal[600], mr: 2 }}>{icon}</Box>
      <Box>
        <Typography variant="subtitle2" color="textSecondary">
          {title}
        </Typography>
        <Typography variant="h6" fontWeight="bold">
          {value}
        </Typography>
      </Box>
    </Card>
  );
};

export default StatCard;