"use client";

import React, { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useVelocity,
  useTransform,
} from "framer-motion";

const MouseMoving = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // 1. LIQUID PHYSICS:
  // Lower stiffness + Higher mass = Heavy, liquid trail that "chases" the mouse.
  const springConfig = { damping: 20, stiffness: 100, mass: 1.2 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const xVelocity = useVelocity(smoothX);
  const yVelocity = useVelocity(smoothY);

  // 2. EXTREME ELASTICITY:
  // Increased the stretch ratio so it looks very long when moving fast.
  const scaleX = useTransform(xVelocity, [-3000, 0, 3000], [3, 1, 3]);
  const scaleY = useTransform(yVelocity, [-3000, 0, 3000], [0.35, 1, 0.35]);

  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    // This calculates the angle so the "liquid" always stretches in the movement direction
    const updateRotation = () => {
      const vx = xVelocity.get();
      const vy = yVelocity.get();
      if (Math.abs(vx) > 10 || Math.abs(vy) > 10) {
        const angle = Math.atan2(vy, vx) * (180 / Math.PI);
        setRotation(angle);
      }
    };

    const unsubscribeX = xVelocity.on("change", updateRotation);

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      unsubscribeX();
    };
  }, [mouseX, mouseY, xVelocity, yVelocity]);

  return (
    <div className="hidden md:block">
      <motion.div
        animate={{
          // 3. COLOR CYCLE: Blending your three provided colors
          backgroundColor: ["#1A4FFF", "#BC4AF6", "#8A31E7", "#1A4FFF"],
          // Added a subtle pulse for more "life"
          scale: [0.95, 1.05, 0.95],
        }}
        transition={{
          backgroundColor: { duration: 5, repeat: Infinity, ease: "linear" },
          scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100px", // Smaller size
          height: "100px",
          borderRadius: "50%",
          translateX: smoothX,
          translateY: smoothY,
          x: "-50%",
          y: "-50%",
          scaleX,
          scaleY,
          rotate: rotation,
          // High blur creates the glow effect
          filter: "blur(55px)",
          opacity: 0.5,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
    </div>
  );
};

export default MouseMoving;
