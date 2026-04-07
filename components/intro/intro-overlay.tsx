"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const P5IntroSketch = dynamic(() => import("./p5-intro-sketch"), {
  ssr: false,
});

type Props = {
  onFinish: () => void;
};

export default function IntroOverlay({ onFinish }: Props) {
  const [isExiting, setIsExiting] = useState(false);

  const handleFinish = () => {
    setIsExiting(true);
    window.setTimeout(() => {
      onFinish();
    }, 800);
  };

  return (
    <div className={`intro-overlay ${isExiting ? "is-exiting" : ""}`}>
      <div className="intro-stage">
        <P5IntroSketch onFinish={handleFinish} />
      </div>
    </div>
  );
}
