"use client";

import { motion } from "framer-motion";

export function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-[#f8fcfc]">
            {/* Teal Bubble */}
            <motion.div
                className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-[#14b8a6]/20 blur-[100px]"
                animate={{
                    x: [0, 50, -20, 0],
                    y: [0, -30, 40, 0],
                    scale: [1, 1.1, 0.9, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
            {/* Orange Bubble */}
            <motion.div
                className="absolute top-[40%] -right-[15%] w-[60vw] h-[60vw] rounded-full bg-[#f97316]/15 blur-[120px]"
                animate={{
                    x: [0, -60, 30, 0],
                    y: [0, 50, -40, 0],
                    scale: [1, 0.9, 1.1, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2,
                }}
            />
        </div>
    );
}
