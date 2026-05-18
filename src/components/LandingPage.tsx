import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";

/**
 * Cinematic spiral-galaxy launcher. Clicking "Launch Your Journey" dives the
 * camera through the galactic core, fades to a twilight horizon silhouette,
 * then hands off to the planetarium dashboard via the onLaunch callback.
 */
export default function LandingPage({ onLaunch }: { onLaunch: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const galaxyRef = useRef<THREE.Points | null>(null);
  const [stage, setStage] = useState<"idle" | "diving" | "horizon">("idle");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02030a);
    scene.fog = new THREE.FogExp2(0x02030a, 0.0015);

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      4000
    );
    camera.position.set(0, 90, 260);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // ---- Spiral galaxy particle system ---------------------------------
    const PARTS = 28000;
    const ARMS = 4;
    const positions = new Float32Array(PARTS * 3);
    const colors = new Float32Array(PARTS * 3);
    const inner = new THREE.Color(0xffd9a0);
    const mid = new THREE.Color(0x7fb4ff);
    const outer = new THREE.Color(0x4f1d8a);

    for (let i = 0; i < PARTS; i++) {
      const t = Math.pow(Math.random(), 1.6); // bias toward core
      const radius = 8 + t * 230;
      const arm = (i % ARMS) * ((Math.PI * 2) / ARMS);
      const swirl = radius * 0.018;
      const angle = arm + swirl + (Math.random() - 0.5) * 0.55;
      const jitter = (1 - t) * 18 + 6;
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * jitter;
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * jitter;
      const y = (Math.random() - 0.5) * (8 + (1 - t) * 28);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const c = new THREE.Color().lerpColors(inner, mid, Math.min(1, t * 1.5));
      if (t > 0.7) c.lerp(outer, (t - 0.7) / 0.3);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const galaxy = new THREE.Points(geo, mat);
    galaxy.rotation.x = -0.35;
    scene.add(galaxy);
    galaxyRef.current = galaxy;

    // Glowing core
    const coreGeo = new THREE.SphereGeometry(10, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffe6b3,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // Distant background stars
    const bgCount = 2500;
    const bgPos = new Float32Array(bgCount * 3);
    for (let i = 0; i < bgCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 1200 + Math.random() * 600;
      bgPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      bgPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      bgPos[i * 3 + 2] = r * Math.cos(phi);
    }
    const bgGeo = new THREE.BufferGeometry();
    bgGeo.setAttribute("position", new THREE.BufferAttribute(bgPos, 3));
    const bgMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      transparent: true,
      opacity: 0.75,
    });
    const bg = new THREE.Points(bgGeo, bgMat);
    scene.add(bg);

    const onResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const dt = clock.getDelta();
      galaxy.rotation.y += dt * 0.045;
      bg.rotation.y += dt * 0.003;
      core.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.1) * 0.06);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      geo.dispose();
      mat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      bgGeo.dispose();
      bgMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode)
        renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  const handleLaunch = () => {
    if (stage !== "idle") return;
    setStage("diving");
    const camera = cameraRef.current;
    if (!camera) {
      onLaunch();
      return;
    }
    // Stage 1: dive toward the galactic core
    const start = camera.position.clone();
    const end = new THREE.Vector3(0, 6, 18);
    const t0 = performance.now();
    const DIVE_MS = 1600;
    const dive = () => {
      const t = Math.min(1, (performance.now() - t0) / DIVE_MS);
      const k = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(start, end, k);
      camera.lookAt(0, 0, 0);
      if (t < 1) requestAnimationFrame(dive);
      else {
        // Stage 2: reveal twilight horizon overlay
        setStage("horizon");
        // Stage 3: hand off to planetarium after pan-up window
        setTimeout(() => onLaunch(), 1500);
      }
    };
    requestAnimationFrame(dive);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white">
      <div ref={containerRef} className="absolute inset-0" />
      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.85)_100%)]" />

      {/* Centered glass card */}
      <div
        className={`relative z-10 flex h-full w-full items-center justify-center px-6 transition-opacity duration-700 ${
          stage === "idle" ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 px-8 py-10 text-center shadow-[0_0_80px_rgba(127,180,255,0.18)] backdrop-blur-2xl sm:px-12 sm:py-14">
          <div className="mb-3 text-[11px] uppercase tracking-[0.4em] text-sky-300/80">
            Celestial Observatory · v1.0
          </div>
          <h1
            className="bg-gradient-to-b from-white via-sky-100 to-sky-400 bg-clip-text font-mono text-4xl font-black tracking-[0.18em] text-transparent drop-shadow-[0_0_30px_rgba(79,195,255,0.5)] sm:text-6xl"
            style={{ textShadow: "0 0 40px rgba(79,195,255,0.35)" }}
          >
            CELESTIAL
            <br />
            WANDERER
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm text-white/70 sm:text-base">
            Your Personal Observatory: Explore, Learn, Engage.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <Button
              onClick={handleLaunch}
              disabled={stage !== "idle"}
              className="group relative h-14 overflow-hidden rounded-full border border-sky-300/40 bg-sky-500/20 px-8 text-base font-semibold uppercase tracking-[0.25em] text-sky-50 backdrop-blur-sm transition-all hover:scale-[1.03] hover:bg-sky-500/30 hover:shadow-[0_0_40px_rgba(79,195,255,0.6)]"
            >
              <span className="absolute inset-0 animate-pulse bg-[radial-gradient(ellipse_at_center,rgba(79,195,255,0.35)_0%,transparent_70%)]" />
              <Rocket className="relative mr-2 h-5 w-5" />
              <span className="relative">Launch Your Journey</span>
            </Button>
            <div className="text-[10px] uppercase tracking-[0.3em] text-white/30">
              Tap to enter the planetarium
            </div>
          </div>
        </div>
      </div>

      {/* Stage 2 — twilight horizon overlay with field silhouette */}
      <div
        className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-700 ${
          stage === "horizon" ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "linear-gradient(to bottom, rgba(8,12,30,0) 0%, rgba(12,18,40,0.6) 45%, rgba(20,16,38,0.95) 65%, #060810 100%)",
        }}
      >
        {/* Field silhouette */}
        <svg
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-[28%] w-full"
        >
          <path
            d="M0 200 L0 120 Q 240 80 480 110 T 960 100 T 1440 120 L 1440 200 Z"
            fill="#04060c"
          />
          {/* Grass blades */}
          {Array.from({ length: 60 }).map((_, i) => (
            <line
              key={i}
              x1={i * 24 + 5}
              y1={130 + Math.sin(i) * 10}
              x2={i * 24 + 5}
              y2={120 + Math.sin(i) * 10}
              stroke="#0a0f1c"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>

      {/* Footer credit */}
      <div className="absolute bottom-3 left-0 right-0 z-30 text-center font-mono text-[10px] text-gray-500">
        Project Director: Achut Mahadev Kadam | Tech Support: krishna0124@gmail.com
      </div>
    </div>
  );
}
