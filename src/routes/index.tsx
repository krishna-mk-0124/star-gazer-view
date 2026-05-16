import { createFileRoute } from "@tanstack/react-router";
import CelestialSphere from "@/components/CelestialSphere";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return <CelestialSphere />;
}
