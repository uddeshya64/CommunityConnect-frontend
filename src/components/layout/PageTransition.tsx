"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }} // Start slightly invisible and pushed down
      animate={{ opacity: 1, y: 0 }}  // Fade in and slide to original position
      transition={{ duration: 0.4, ease: "easeOut" }} // Smooth timing
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}