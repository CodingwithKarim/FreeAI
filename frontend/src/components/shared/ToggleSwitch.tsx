import React from "react";
import { motion } from "framer-motion";

type ToggleSwitchProps = {
  isOn: boolean;
  disabled?: boolean;
  onToggle: () => void;
  label?: string;
};

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  isOn,
  disabled = false,         // default to false
  onToggle,
  label,
}) => {
  // guard click
  const handleClick = () => {
    if (disabled) return;
    onToggle();
  };

  return (
    <div
      className={`
        flex items-center space-x-3
        ${disabled ? "opacity-50" : ""}   /* dim whole control */
      `}
      aria-disabled={disabled}            /* a11y */
    >
      <motion.div
        onClick={handleClick}             /* only fire when not disabled */
        initial={true}
        animate={{
          backgroundColor: isOn ? "#c38bfa" : "#E5E7EB",
        }}
        whileTap={disabled ? {} : { scale: 0.9 }}  /* no press animation if disabled */
        className={`
          relative w-12 h-6 rounded-full
          ${disabled ? "cursor-not-allowed" : "cursor-pointer"}  /* switch cursor */
          ${isOn ? "shadow-lg" : ""}
          transition-colors
        `}
      >
        <motion.div
          className="absolute top-0 left-0 w-6 h-6 bg-white rounded-full shadow-md"
          animate={{ x: isOn ? 24 : 0 }}
          transition={{ type: "spring", stiffness: 700, damping: 30 }}
        />
      </motion.div>

      {label && (
        <span
          className={`
            text-sm font-medium select-none
            ${disabled ? "text-gray-400" : "text-gray-700"}  /* dim label */
          `}
        >
          {label}
        </span>
      )}
    </div>
  );
};
