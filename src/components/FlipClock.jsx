import React, { useState, useEffect } from "react";
import "./FlipClock.css";

const FlipClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const format = (num) => num.toString().padStart(2, "0");

  const hours = format(time.getHours());
  const minutes = format(time.getMinutes());
  const seconds = format(time.getSeconds());

  return (
    <div className="flip-clock">
      <div className="flip-unit">{hours}</div>
      <div className="flip-separator">:</div>
      <div className="flip-unit">{minutes}</div>
      <div className="flip-separator">:</div>
      <div className="flip-unit">{seconds}</div>
    </div>
  );
};

export default FlipClock;