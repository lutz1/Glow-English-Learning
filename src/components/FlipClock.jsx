import React, { useState, useEffect } from "react";
import "./FlipClock.css";

const FlipUnit = ({ unit }) => {
  const [prevUnit, setPrevUnit] = useState(unit);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (unit !== prevUnit) {
      setFlipping(true);
      const timeout = setTimeout(() => {
        setFlipping(false);
        setPrevUnit(unit);
      }, 600); // animation duration
      return () => clearTimeout(timeout);
    }
  }, [unit, prevUnit]);

  return (
    <div className="flip-unit-wrapper">
      <div className={`flip-unit ${flipping ? "flipping" : ""}`}>
        <span className="front">{prevUnit}</span>
        <span className="back">{unit}</span>
      </div>
    </div>
  );
};

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
      <FlipUnit unit={hours} />
      <div className="flip-separator">:</div>
      <FlipUnit unit={minutes} />
      <div className="flip-separator">:</div>
      <FlipUnit unit={seconds} />
    </div>
  );
};

export default FlipClock;