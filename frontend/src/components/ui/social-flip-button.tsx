"use client";

import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  FaGithub,
  FaTwitter,
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaEnvelope,
  FaDiscord,
} from "react-icons/fa";

export interface SocialItem {
  letter: string;
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface SocialFlipButtonProps {
  items?: SocialItem[];
  className?: string;
  itemClassName?: string;
  frontClassName?: string;
  backClassName?: string;
}

const defaultItems: SocialItem[] = [
  { letter: "C", icon: <FaGithub size={18} />, label: "Github", href: "https://github.com/login" },
  { letter: "O", icon: <FaTwitter size={18} />, label: "Twitter", href: "https://x.com/i/flow/login" },
  { letter: "N", icon: <FaLinkedin size={18} />, label: "LinkedIn", href: "https://www.linkedin.com/login" },
  { letter: "T", icon: <FaInstagram size={18} />, label: "Instagram", href: "https://www.instagram.com/accounts/login/" },
  { letter: "A", icon: <FaFacebook size={18} />, label: "Facebook", href: "https://www.facebook.com/login/" },
  { letter: "C", icon: <FaEnvelope size={18} />, label: "Email", href: "https://accounts.google.com/" },
  { letter: "T", icon: <FaDiscord size={18} />, label: "Discord", href: "https://discord.com/login" },
];

const SocialFlipNode = ({
  item,
  index,
  isHovered,
  setTooltipIndex,
  tooltipIndex,
  itemClassName,
  frontClassName,
  backClassName,
}: {
  item: SocialItem;
  index: number;
  isHovered: boolean;
  setTooltipIndex: (val: number | null) => void;
  tooltipIndex: number | null;
  itemClassName?: string;
  frontClassName?: string;
  backClassName?: string;
}) => {
  const [isNodeHovered, setIsNodeHovered] = useState(false);
  const Wrapper = item.href ? "a" : "div";
  const wrapperProps = item.href
    ? { href: item.href, target: "_blank", rel: "noopener noreferrer", "aria-label": item.label }
    : { onClick: item.onClick, role: "button", tabIndex: 0, "aria-label": item.label };

  const isCurrentActive = isNodeHovered || tooltipIndex === index;

  return (
    <Wrapper
      {...wrapperProps}
      className={cn("social-flip-tile", itemClassName)}
      style={{
        position: "relative",
        width: "40px",
        height: "40px",
        minWidth: "40px",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        perspective: "1000px",
        textDecoration: "none",
        outline: "none",
      }}
      onMouseEnter={() => {
        setIsNodeHovered(true);
        setTooltipIndex(index);
      }}
      onMouseLeave={() => {
        setIsNodeHovered(false);
        setTooltipIndex(null);
      }}
      onFocus={() => {
        setIsNodeHovered(true);
        setTooltipIndex(index);
      }}
      onBlur={() => {
        setIsNodeHovered(false);
        setTooltipIndex(null);
      }}
    >
      {/* Tooltip positioned directly above this individual hovered tile */}
      <AnimatePresence>
        {isCurrentActive && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.85, x: "-50%" }}
            animate={{ opacity: 1, y: -10, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, y: 6, scale: 0.85, x: "-50%" }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              zIndex: 9999,
              whiteSpace: "nowrap",
              borderRadius: "8px",
              background: "#18181b",
              color: "#ffffff",
              padding: "5px 10px",
              fontSize: "12px",
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "0.02em",
              boxShadow: "0 6px 16px rgba(0,0,0,0.22)",
              pointerEvents: "none",
            }}
          >
            {item.label}
            {/* Arrow pointing down directly toward top center of tile */}
            <div
              style={{
                position: "absolute",
                bottom: "-3px",
                left: "50%",
                transform: "translateX(-50%) rotate(45deg)",
                width: "6px",
                height: "6px",
                background: "#18181b",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
        }}
        initial={false}
        animate={{ rotateY: isHovered ? 180 : 0 }}
        transition={{
          duration: 0.8,
          type: "spring",
          stiffness: 120,
          damping: 15,
          delay: index * 0.08,
        }}
      >
        {/* Front Face - Letter */}
        <div
          className={cn("social-flip-front", frontClassName)}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "10px",
            background: "#f4f4f5",
            border: "1px solid #e4e4e7",
            color: "#18181b",
            fontSize: "16px",
            fontWeight: 800,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {item.letter}
        </div>

        {/* Back Face - Icon */}
        <div
          className={cn("social-flip-back", backClassName)}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "10px",
            background: "#09090b",
            border: "1px solid #27272a",
            color: "#ffffff",
            fontSize: "18px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {item.icon}
        </div>
      </motion.div>
    </Wrapper>
  );
};

export function SocialFlipButton({
  items = defaultItems,
  className,
  itemClassName,
  frontClassName,
  backClassName,
}: SocialFlipButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);

  return (
    <div
      className={cn("social-flip-container", className)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div
        className="social-flip-card"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "10px 14px",
          borderRadius: "16px",
          background: "#ffffff",
          border: "1px solid #e4e4e7",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setTooltipIndex(null);
        }}
      >
        {/* Animated Border Lines Container - Clipped */}
        <div
          style={{
            position: "absolute",
            inset: "-1px",
            overflow: "hidden",
            borderRadius: "16px",
            pointerEvents: "none",
          }}
        >
          {/* Animated Top Border Line */}
          <motion.div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "1px",
              width: "100%",
              background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.45), transparent)",
            }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          {/* Animated Bottom Border Line */}
          <motion.div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              height: "1px",
              width: "100%",
              background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.45), transparent)",
            }}
            animate={{ x: ["100%", "-100%"] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>

        {items.map((item, index) => (
          <SocialFlipNode
            key={index}
            item={item}
            index={index}
            isHovered={isHovered}
            setTooltipIndex={setTooltipIndex}
            tooltipIndex={tooltipIndex}
            itemClassName={itemClassName}
            frontClassName={frontClassName}
            backClassName={backClassName}
          />
        ))}
      </div>
    </div>
  );
}

export default SocialFlipButton;
