"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      // Show when page has scrolled past 320px
      setIsVisible(window.scrollY > 320);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          onClick={scrollToTop}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.9 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          whileHover={reduceMotion ? undefined : { y: -3, scale: 1.04 }}
          whileTap={reduceMotion ? undefined : { scale: 0.96 }}
          aria-label="Scroll to top of page"
          className="fixed bottom-6 right-6 z-40 group flex size-12 items-center justify-center rounded-full border border-gold/40 bg-charcoal text-pearl shadow-[0_12px_32px_rgba(29,27,25,0.22)] backdrop-blur-md transition-colors hover:border-gold hover:bg-gold hover:text-charcoal sm:bottom-8 sm:right-8"
        >
          <ArrowUp
            aria-hidden="true"
            size={18}
            strokeWidth={1.75}
            className="transition-transform duration-300 group-hover:-translate-y-0.5"
          />
          <span className="sr-only">Scroll back to top</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
