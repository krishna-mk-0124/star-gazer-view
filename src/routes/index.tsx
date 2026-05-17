import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import CelestialSphere from "@/components/CelestialSphere";
import LandingPage from "@/components/LandingPage";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [launched, setLaunched] = useState(false);
  const [fading, setFading] = useState(false);

  const handleLaunch = () => {
    setFading(true);
    setTimeout(() => setLaunched(true), 700);
  };

  if (launched) return <CelestialSphere />;
  return (
    <div
      className={`transition-opacity duration-700 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <LandingPage onLaunch={handleLaunch} />
    </div>
  );
}
