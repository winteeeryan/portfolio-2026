"use client";

import { useEffect, useState } from "react";
import IntroOverlay from "./intro-overlay";

export default function IntroGate() {
  const [showIntro, setShowIntro] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const played = window.sessionStorage.getItem("portfolio-intro-played");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!played && !reduceMotion) {
      setShowIntro(true);
      document.documentElement.classList.add("intro-active");
    }
  }, []);

  const handleFinish = () => {
    window.sessionStorage.setItem("portfolio-intro-played", "true");
    document.documentElement.classList.remove("intro-active");
    setShowIntro(false);
  };

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("intro-active");
    };
  }, []);

  if (!mounted || !showIntro) return null;

  return <IntroOverlay onFinish={handleFinish} />;
}
