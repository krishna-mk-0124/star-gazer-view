import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Pause, Play, FastForward, Rewind, Sparkles } from "lucide-react";
import { STARS, CONSTELLATIONS, raDecToVec3 } from "@/lib/starCatalog";
import { PLANETS } from "@/lib/planets";
import { getPlanetPositions } from "@/lib/horizons.functions";

type Location = { city: string; lat: number; lon: number };

const DEFAULT_LOCATION: Location = {
  city: "Bangalore, India",
  lat: 12.9716,
  lon: 77.5946,
};

type Speed = "pause" | "real" | "fast" | "rewind";

export default function CelestialSphere() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);
  const [speed, setSpeed] = useState<Speed>("real");
  const [constellationsVisible, setConstellationsVisible] = useState(true);
  const speedRef = useRef<Speed>("real");
  const constellationsRef = useRef(true);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    constellationsRef.current = constellationsVisible;
  }, [constellationsVisible]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formCity, setFormCity] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLon, setFormLon] = useState("");

  // Planet system refs (used by animation loop + ephemeris poller)
  const simDateRef = useRef<Date>(new Date());
  const planetMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const fetchPositions = useServerFn(getPlanetPositions);

  // Geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          city: "Your Location",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      () => {
        console.warn("Geolocation denied, using default location.");
      },
      { timeout: 8000 }
    );
  }, []);

  // Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060d);

    const camera = new THREE.PerspectiveCamera(
      72,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Stars: random points on a large sphere (inside view)
    const starCount = 6000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 500;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      const t = Math.random();
      // subtle blue/white/yellow tint
      colors[i * 3] = 0.8 + 0.2 * t;
      colors[i * 3 + 1] = 0.85 + 0.15 * Math.random();
      colors[i * 3 + 2] = 0.9 + 0.1 * Math.random();
      sizes[i] = Math.random() * 1.6 + 0.4;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    starGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const starMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Named catalog stars — sized & tinted by magnitude (blue-white)
    const STAR_R = 490;
    const catalogKeys = Object.keys(STARS);
    const catPositions = new Float32Array(catalogKeys.length * 3);
    const catColors = new Float32Array(catalogKeys.length * 3);
    const catSizes = new Float32Array(catalogKeys.length);
    catalogKeys.forEach((key, i) => {
      const s = STARS[key];
      const [x, y, z] = raDecToVec3(s.ra, s.dec, STAR_R);
      catPositions[i * 3] = x;
      catPositions[i * 3 + 1] = y;
      catPositions[i * 3 + 2] = z;
      // Brightness from magnitude: lower mag = brighter
      const brightness = Math.max(0.35, Math.min(1, (4 - s.mag) / 5));
      // Blue-white tint
      catColors[i * 3] = 0.75 + 0.25 * brightness;
      catColors[i * 3 + 1] = 0.85 + 0.15 * brightness;
      catColors[i * 3 + 2] = 1.0;
      catSizes[i] = 2 + brightness * 6;
    });
    const catGeo = new THREE.BufferGeometry();
    catGeo.setAttribute("position", new THREE.BufferAttribute(catPositions, 3));
    catGeo.setAttribute("color", new THREE.BufferAttribute(catColors, 3));
    catGeo.setAttribute("size", new THREE.BufferAttribute(catSizes, 1));
    const catMat = new THREE.PointsMaterial({
      size: 5,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const catalogStars = new THREE.Points(catGeo, catMat);
    scene.add(catalogStars);

    // Constellation lines — glowing neon-blue
    const linePts: number[] = [];
    for (const [a, b] of CONSTELLATIONS) {
      const sa = STARS[a];
      const sb = STARS[b];
      if (!sa || !sb) continue;
      const [ax, ay, az] = raDecToVec3(sa.ra, sa.dec, STAR_R - 2);
      const [bx, by, bz] = raDecToVec3(sb.ra, sb.dec, STAR_R - 2);
      linePts.push(ax, ay, az, bx, by, bz);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(linePts), 3)
    );
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x4fc3ff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const constellationLines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(constellationLines);

    // Milky-way-ish faint band
    const bandGeo = new THREE.SphereGeometry(480, 32, 32);
    const bandMat = new THREE.MeshBasicMaterial({
      color: 0x1a2348,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.25,
    });
    scene.add(new THREE.Mesh(bandGeo, bandMat));

    // Horizon ring (faint)
    const ringGeo = new THREE.RingGeometry(450, 460, 128);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x2a3a6a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    // Look controls
    let yaw = 0;
    let pitch = 0;
    const pitchLimit = Math.PI / 2 - 0.05;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const onDown = (x: number, y: number) => {
      isDragging = true;
      lastX = x;
      lastY = y;
    };
    const onMove = (x: number, y: number) => {
      if (!isDragging) return;
      const dx = x - lastX;
      const dy = y - lastY;
      lastX = x;
      lastY = y;
      yaw -= dx * 0.003;
      pitch -= dy * 0.003;
      pitch = Math.max(-pitchLimit, Math.min(pitchLimit, pitch));
    };
    const onUp = () => {
      isDragging = false;
    };

    const el = renderer.domElement;
    const mouseDown = (e: MouseEvent) => onDown(e.clientX, e.clientY);
    const mouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const touchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      onDown(t.clientX, t.clientY);
    };
    const touchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    };
    el.addEventListener("mousedown", mouseDown);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", onUp);
    el.addEventListener("touchstart", touchStart, { passive: true });
    el.addEventListener("touchmove", touchMove, { passive: true });
    el.addEventListener("touchend", onUp);

    // Sky rotation simulation
    let simTime = 0;
    const speedMap: Record<Speed, number> = {
      pause: 0,
      real: 1,
      fast: 10,
      rewind: -5,
    };

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const dt = clock.getDelta();
      simTime += dt * speedMap[speedRef.current] * 0.02;
      stars.rotation.y = simTime;
      catalogStars.rotation.y = simTime;
      constellationLines.rotation.y = simTime;
      constellationLines.visible = constellationsRef.current;

      // Camera orientation from yaw/pitch
      const dir = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        Math.cos(yaw) * Math.cos(pitch)
      );
      camera.lookAt(dir);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", onUp);
      el.removeEventListener("touchstart", touchStart);
      el.removeEventListener("touchmove", touchMove);
      el.removeEventListener("touchend", onUp);
      renderer.dispose();
      starGeo.dispose();
      starMat.dispose();
      catGeo.dispose();
      catMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
    };
  }, []);

  const submitLocation = () => {
    const lat = parseFloat(formLat);
    const lon = parseFloat(formLon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      setLocation({
        city: formCity || "Custom Location",
        lat,
        lon,
      });
      setModalOpen(false);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Top header */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center p-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-2 backdrop-blur-xl">
          <MapPin className="h-4 w-4 text-sky-400" />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide text-white">
              {location.city}
            </div>
            <div className="text-[11px] font-mono text-white/60">
              {location.lat.toFixed(4)}°, {location.lon.toFixed(4)}°
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="ml-2 h-8 bg-white/10 text-white hover:bg-white/20"
            onClick={() => {
              setFormCity(location.city);
              setFormLat(String(location.lat));
              setFormLon(String(location.lon));
              setModalOpen(true);
            }}
          >
            Change
          </Button>
        </div>
      </header>

      {/* Bottom HUD */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center p-6">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 shadow-2xl backdrop-blur-xl">
          <HudButton
            active={speed === "pause"}
            onClick={() => setSpeed("pause")}
            icon={<Pause className="h-4 w-4" />}
            label="Pause"
          />
          <HudButton
            active={speed === "real"}
            onClick={() => setSpeed("real")}
            icon={<Play className="h-4 w-4" />}
            label="Real-Time"
          />
          <HudButton
            active={speed === "fast"}
            onClick={() => setSpeed("fast")}
            icon={<FastForward className="h-4 w-4" />}
            label="10x Speed"
          />
          <HudButton
            active={speed === "rewind"}
            onClick={() => setSpeed("rewind")}
            icon={<Rewind className="h-4 w-4" />}
            label="Rewind"
          />
          <div className="mx-1 h-6 w-px bg-white/15" />
          <HudButton
            active={constellationsVisible}
            onClick={() => setConstellationsVisible((v) => !v)}
            icon={<Sparkles className="h-4 w-4" />}
            label="Constellations"
          />
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="border-white/10 bg-black/80 text-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Change Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                placeholder="e.g. Tokyo, Japan"
                className="bg-white/10 border-white/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  value={formLat}
                  onChange={(e) => setFormLat(e.target.value)}
                  placeholder="12.9716"
                  className="bg-white/10 border-white/20"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lon">Longitude</Label>
                <Input
                  id="lon"
                  value={formLon}
                  onChange={(e) => setFormLon(e.target.value)}
                  placeholder="77.5946"
                  className="bg-white/10 border-white/20"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              className="bg-white/10 text-white hover:bg-white/20"
            >
              Cancel
            </Button>
            <Button onClick={submitLocation}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HudButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
        active
          ? "bg-sky-500/90 text-white shadow-lg shadow-sky-500/30"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
