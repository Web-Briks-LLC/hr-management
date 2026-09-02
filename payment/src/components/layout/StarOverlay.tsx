"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const StarOverlay = () => {
  const [stars, setStars] = useState<
    { id: number; x: number; y: number; size: number; duration: number; delay: number }[]
  >([]);

  useEffect(() => {
    // Generate stars on mount to prevent hydration mismatch
    const generateStars = Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, 
      y: Math.random() * 100, 
      size: Math.random() * 4 + 2, 
      duration: Math.random() * 3 + 2, 
      delay: Math.random() * 5, 
    }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStars(generateStars);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute bg-white rounded-full"
          style={{
            left: `${star.x}vw`,
            top: `${star.y}vh`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            boxShadow: "0 0 6px 1px rgba(255, 255, 255, 0.2)",
          }}
          animate={{
            opacity: [0, 0.5, 0],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default StarOverlay;