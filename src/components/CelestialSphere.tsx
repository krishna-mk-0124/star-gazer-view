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
import {
  MapPin,
  Pause,
  Play,
  FastForward,
  Rewind,
  Sparkles,
  GraduationCap,
  Mountain,
} from "lucide-react";
import { STARS, CONSTELLATIONS, raDecToVec3 } from "@/lib/starCatalog";
import { PLANETS } from "@/lib/planets";
import { getPlanetPositions } from "@/lib/horizons.functions";
import { getSatelliteTLEs } from "@/lib/satellites.functions";
import * as satellite from "satellite.js";
import {
  CelestialInfoPanel,
  type CelestialSelection,
  type SatelliteMeta,
} from "@/components/CelestialInfoPanel";
import { QuizModal } from "@/components/QuizModal";
import { raDecToAzAlt } from "@/lib/astro";

type Location = { city: string; lat: number; lon: number };

const DEFAULT_LOCATION: Location = {
  city: "Bangalore, India",
  lat: 12.9716,
  lon: 77.5946,
};

type Speed = "pause" | "real" | "fast" | "rewind";

// ---- helpers -----------------------------------------------------
const DEG2RAD = Math.PI / 180;

/** Greenwich Mean Sidereal Time in radians (Meeus). */
function gmstRad(date: Date): number {
  const JD = date.getTime() / 86400000 + 2440587.5;
  const T = (JD - 2451545.0) / 36525;
  let GMST =
    280.46061837 +
    360.98564736629 * (JD - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  GMST = ((GMST % 360) + 360) % 360;
  return GMST * DEG2RAD;
}

export default function CelestialSphere() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);
  const [speed, setSpeed] = useState<Speed>("real");
  const [constellationsVisible, setConstellationsVisible] = useState(true);
  const [groundFilter, setGroundFilter] = useState(true);

  const speedRef = useRef<Speed>("real");
  const constellationsRef = useRef(true);
  const groundFilterRef = useRef(true);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    constellationsRef.current = constellationsVisible;
  }, [constellationsVisible]);
  useEffect(() => {
    groundFilterRef.current = groundFilter;
  }, [groundFilter]);

  const [modalOpen, setModalOpen] = useState(false);
  const [formCity, setFormCity] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLon, setFormLon] = useState("");

  const simDateRef = useRef<Date>(new Date());
  const planetMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const fetchPositions = useServerFn(getPlanetPositions);
  const fetchSatTLEs = useServerFn(getSatelliteTLEs);
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  type SatRuntime = {
    name: string;
    id: string;
    catnr: string;
    satrec: satellite.SatRec;
    meta: SatelliteMeta;
    mesh: THREE.Mesh;
    label: CSS2DObject;
    trailGeo: THREE.BufferGeometry;
    trailPositions: Float32Array;
    trailCount: number;
    trailHead: number;
    // Dead-reckoning cache (ECI km, km/s)
    lastEciPos?: { x: number; y: number; z: number };
    lastEciVel?: { x: number; y: number; z: number };
    lastValidTime?: Date;
    lastAz?: number;
    lastAlt?: number;
    lastRangeKm?: number;
    lastSpeedKms?: number;
  };
  const satellitesRef = useRef<SatRuntime[]>([]);
  const satGroupRef = useRef<THREE.Group | null>(null);

  // Selection — IMMUTABLE SNAPSHOT (no live refresh)
  const [selection, setSelection] = useState<CelestialSelection | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  type SelectionTarget =
    | { kind: "star"; key: string; getWorldPos: (out: THREE.Vector3) => THREE.Vector3 }
    | { kind: "planet"; id: string; getWorldPos: (out: THREE.Vector3) => THREE.Vector3 }
    | { kind: "satellite"; idx: number; getWorldPos: (out: THREE.Vector3) => THREE.Vector3 };
  const selectionTargetRef = useRef<SelectionTarget | null>(null);
  const targetRingRef = useRef<THREE.Mesh | null>(null);

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

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    const labelEl = labelRenderer.domElement;
    labelEl.style.position = "absolute";
    labelEl.style.inset = "0";
    labelEl.style.pointerEvents = "none";
    container.appendChild(labelEl);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(100, 80, 50);
    scene.add(sun);

    // Observer/equatorial groups for LST-driven rotation + lat tilt
    const observerGroup = new THREE.Group();
    scene.add(observerGroup);
    const equatorialGroup = new THREE.Group();
    observerGroup.add(equatorialGroup);

    // Random background stars
    const starCount = 6000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 500;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      colors[i * 3] = 0.8 + 0.2 * Math.random();
      colors[i * 3 + 1] = 0.85 + 0.15 * Math.random();
      colors[i * 3 + 2] = 0.9 + 0.1 * Math.random();
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
    });
    const stars = new THREE.Points(starGeo, starMat);
    equatorialGroup.add(stars);

    // Catalog stars
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
      const brightness = Math.max(0.35, Math.min(1, (4 - s.mag) / 5));
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
    equatorialGroup.add(catalogStars);

    // Constellation lines
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
    lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(linePts), 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x4fc3ff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const constellationLines = new THREE.LineSegments(lineGeo, lineMat);
    equatorialGroup.add(constellationLines);

    // Planets
    const PLANET_R = 460;
    const texLoader = new THREE.TextureLoader();
    texLoader.setCrossOrigin("anonymous");
    const planetGroup = new THREE.Group();
    equatorialGroup.add(planetGroup);
    const localMeshes = new Map<string, THREE.Mesh>();
    for (const p of PLANETS) {
      const geo = new THREE.SphereGeometry(p.radius, 48, 48);
      const mat = new THREE.MeshStandardMaterial({
        color: p.color,
        roughness: 0.9,
        metalness: 0.0,
      });
      texLoader.load(
        p.texture,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          mat.map = tex;
          mat.color.set(0xffffff);
          mat.needsUpdate = true;
        },
        undefined,
        () => {}
      );
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(PLANET_R, 0, 0);
      mesh.userData = {
        rotPerSec: (Math.PI * 2) / (p.rotationPeriodHours * 3600 || 1),
        name: p.name,
      };

      const labelDiv = document.createElement("div");
      labelDiv.textContent = p.name;
      labelDiv.className =
        "px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide text-sky-100 bg-black/55 border border-sky-400/30 backdrop-blur-sm shadow-[0_0_10px_rgba(79,195,255,0.25)] whitespace-nowrap";
      const labelObj = new CSS2DObject(labelDiv);
      labelObj.position.set(0, p.radius + 6, 0);
      mesh.add(labelObj);

      planetGroup.add(mesh);
      localMeshes.set(p.id, mesh);
    }
    planetMeshesRef.current = localMeshes;

    // Satellite group — uses observer-frame Az/Alt directly (not equatorial)
    const satGroup = new THREE.Group();
    scene.add(satGroup);
    satGroupRef.current = satGroup;

    const bandGeo = new THREE.SphereGeometry(480, 32, 32);
    const bandMat = new THREE.MeshBasicMaterial({
      color: 0x1a2348,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.25,
    });
    scene.add(new THREE.Mesh(bandGeo, bandMat));

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
    let dragDist = 0;

    const onDown = (x: number, y: number) => {
      isDragging = true;
      lastX = x;
      lastY = y;
      dragDist = 0;
    };
    const onMove = (x: number, y: number) => {
      if (!isDragging) return;
      const dx = x - lastX;
      const dy = y - lastY;
      lastX = x;
      lastY = y;
      dragDist += Math.hypot(dx, dy);
      yaw -= dx * 0.003;
      pitch -= dy * 0.003;
      pitch = Math.max(-pitchLimit, Math.min(pitchLimit, pitch));
    };
    const onUp = () => {
      isDragging = false;
    };

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 6 };
    const ndc = new THREE.Vector2();

    // Pulsing target ring overlay
    const ringGeoSel = new THREE.RingGeometry(10, 12, 64);
    const ringMatSel = new THREE.MeshBasicMaterial({
      color: 0x4fc3ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const targetRing = new THREE.Mesh(ringGeoSel, ringMatSel);
    targetRing.visible = false;
    scene.add(targetRing);
    targetRingRef.current = targetRing;

    /** Build a frozen snapshot capturing live coords at click instant. */
    const snapshot = (
      base: Omit<CelestialSelection, "az" | "alt" | "capturedAt"> & {
        az?: number;
        alt?: number;
      }
    ): CelestialSelection => {
      const loc = locationRef.current;
      const date = simDateRef.current;
      let az = base.az;
      let alt = base.alt;
      if ((az === undefined || alt === undefined) && base.ra !== undefined && base.dec !== undefined) {
        const r = raDecToAzAlt(base.ra, base.dec, loc.lat, loc.lon, date);
        az = r.az;
        alt = r.alt;
      }
      return {
        ...base,
        az,
        alt,
        capturedAt: new Date().toISOString(),
      };
    };

    const tryPick = (ndcX: number, ndcY: number) => {
      ndc.set(ndcX, ndcY);
      raycaster.setFromCamera(ndc, camera);

      const sats = satellitesRef.current;
      const satMeshes = sats.map((s) => s.mesh).filter((m) => m.visible);
      const satHits = raycaster.intersectObjects(satMeshes, false);
      if (satHits.length > 0) {
        const hitMesh = satHits[0].object as THREE.Mesh;
        const idx = sats.findIndex((s) => s.mesh === hitMesh);
        if (idx >= 0) {
          const s = sats[idx];
          selectionTargetRef.current = {
            kind: "satellite",
            idx,
            getWorldPos: (out) => s.mesh.getWorldPosition(out),
          };
          setSelection(
            snapshot({
              kind: "satellite",
              name: s.name,
              az: s.lastAz,
              alt: s.lastAlt,
              distanceKm: s.lastRangeKm,
              velocityKms: s.lastSpeedKms,
              nasaQuery: s.name.replace(/\(.*\)/, "").trim(),
              satMeta: s.meta,
            })
          );
          return;
        }
      }

      const planetMeshes = Array.from(localMeshes.values());
      const planetHits = raycaster.intersectObjects(planetMeshes, false);
      if (planetHits.length > 0) {
        const hitMesh = planetHits[0].object as THREE.Mesh;
        const planet = PLANETS.find((p) => localMeshes.get(p.id) === hitMesh);
        if (planet) {
          selectionTargetRef.current = {
            kind: "planet",
            id: planet.id,
            getWorldPos: (out) => hitMesh.getWorldPosition(out),
          };
          setSelection(
            snapshot({
              kind: "planet",
              name: planet.name,
              ra: hitMesh.userData.ra,
              dec: hitMesh.userData.dec,
              distanceKm: hitMesh.userData.rangeKm,
              nasaQuery: planet.name,
            })
          );
          return;
        }
      }

      const starHits = raycaster.intersectObject(catalogStars, false);
      if (starHits.length > 0 && starHits[0].index !== undefined) {
        const i = starHits[0].index;
        const key = catalogKeys[i];
        const s = STARS[key];
        if (s) {
          selectionTargetRef.current = {
            kind: "star",
            key,
            getWorldPos: (out) => {
              const attr = catalogStars.geometry.getAttribute(
                "position"
              ) as THREE.BufferAttribute;
              out.fromBufferAttribute(attr, i);
              return out.applyMatrix4(catalogStars.matrixWorld);
            },
          };
          setSelection(
            snapshot({
              kind: "star",
              name: s.name,
              ra: s.ra,
              dec: s.dec,
              mag: s.mag,
              nasaQuery: s.name,
            })
          );
          return;
        }
      }
    };

    const el = renderer.domElement;
    const mouseDown = (e: MouseEvent) => onDown(e.clientX, e.clientY);
    const mouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onClick = (e: MouseEvent) => {
      if (dragDist > 5) return;
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      tryPick(x, y);
    };
    const touchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      onDown(t.clientX, t.clientY);
    };
    const touchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    };
    const touchEnd = (e: TouchEvent) => {
      if (dragDist <= 5 && e.changedTouches[0]) {
        const t = e.changedTouches[0];
        const rect = el.getBoundingClientRect();
        const x = ((t.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((t.clientY - rect.top) / rect.height) * 2 + 1;
        tryPick(x, y);
      }
      onUp();
    };
    el.addEventListener("mousedown", mouseDown);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", onUp);
    el.addEventListener("click", onClick);
    el.addEventListener("touchstart", touchStart, { passive: true });
    el.addEventListener("touchmove", touchMove, { passive: true });
    el.addEventListener("touchend", touchEnd);

    let simDateMs = Date.now();
    const simSecondsPerWall: Record<Speed, number> = {
      pause: 0,
      real: 1,
      fast: 600,
      rewind: -300,
    };

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      labelRenderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const dt = clock.getDelta();
      const spd = speedRef.current;
      simDateMs += dt * 1000 * simSecondsPerWall[spd];
      const now = new Date(simDateMs);
      simDateRef.current = now;
      const loc = locationRef.current;

      // Sky orientation: latitude tilt + LST-driven rotation
      const lst = gmstRad(now) + loc.lon * DEG2RAD;
      observerGroup.rotation.x = -((Math.PI / 2) - loc.lat * DEG2RAD);
      equatorialGroup.rotation.y = -lst;

      constellationLines.visible = constellationsRef.current;

      // Hide stars/planets below horizon when groundFilter is on
      // (use world Y after observer/equatorial transforms)
      const tmpVec = new THREE.Vector3();
      const ground = groundFilterRef.current;

      // Axial planet rotation + horizon visibility
      const sign = spd === "rewind" ? -1 : spd === "pause" ? 0 : 1;
      const axisDt = dt * Math.abs(simSecondsPerWall[spd]) * sign;
      localMeshes.forEach((mesh) => {
        mesh.rotation.y += (mesh.userData.rotPerSec as number) * axisDt;
        mesh.getWorldPosition(tmpVec);
        mesh.visible = !ground || tmpVec.y > 0;
      });

      // Satellites — dead-reckoning propagator
      const sats = satellitesRef.current;
      if (sats.length > 0) {
        const gmst = satellite.gstime(now);
        const observer = {
          longitude: loc.lon * DEG2RAD,
          latitude: loc.lat * DEG2RAD,
          height: 0.1,
        };
        const SAT_R = 440;
        const pulse = 1 + 0.35 * Math.sin(performance.now() * 0.006);

        for (const sat of sats) {
          // Primary: SGP4 propagate
          let eciPos: { x: number; y: number; z: number } | null = null;
          let eciVel: { x: number; y: number; z: number } | null = null;
          try {
            const pv = satellite.propagate(sat.satrec, now);
            if (
              pv &&
              pv.position &&
              typeof pv.position !== "boolean" &&
              Number.isFinite(pv.position.x)
            ) {
              eciPos = pv.position as { x: number; y: number; z: number };
              if (
                pv.velocity &&
                typeof pv.velocity !== "boolean" &&
                Number.isFinite(pv.velocity.x)
              ) {
                eciVel = pv.velocity as { x: number; y: number; z: number };
              }
            }
          } catch {
            /* fall through */
          }

          // Dead-reckon fallback: extrapolate from last cached p+v
          if (!eciPos && sat.lastEciPos && sat.lastEciVel && sat.lastValidTime) {
            const dts = (now.getTime() - sat.lastValidTime.getTime()) / 1000;
            // Cap dead-reckoning window so it doesn't drift forever
            if (Math.abs(dts) < 60 * 30) {
              eciPos = {
                x: sat.lastEciPos.x + sat.lastEciVel.x * dts,
                y: sat.lastEciPos.y + sat.lastEciVel.y * dts,
                z: sat.lastEciPos.z + sat.lastEciVel.z * dts,
              };
              eciVel = sat.lastEciVel;
            }
          }

          if (!eciPos) {
            sat.mesh.visible = false;
            sat.label.visible = false;
            continue;
          }

          // Cache when we got a fresh SGP4 result
          if (eciVel) {
            sat.lastEciPos = eciPos;
            sat.lastEciVel = eciVel;
            sat.lastValidTime = now;
          }

          const ecf = satellite.eciToEcf(eciPos, gmst);
          const look = satellite.ecfToLookAngles(observer, ecf);
          const above = look.elevation > 0;
          const show = !ground || above;
          sat.mesh.visible = show;
          sat.label.visible = show;
          if (!show) continue;

          const az = look.azimuth;
          const elv = look.elevation;
          const rangeKm = look.rangeSat;
          const x = SAT_R * Math.cos(elv) * Math.sin(az);
          const y = SAT_R * Math.sin(elv);
          const z = SAT_R * Math.cos(elv) * Math.cos(az);
          sat.mesh.position.set(x, y, z);
          sat.mesh.scale.setScalar(pulse);
          sat.lastAz = az;
          sat.lastAlt = elv;
          sat.lastRangeKm = rangeKm;
          if (eciVel) {
            sat.lastSpeedKms = Math.hypot(eciVel.x, eciVel.y, eciVel.z);
          }

          // Trail ring buffer
          const idx = sat.trailHead * 3;
          sat.trailPositions[idx] = x;
          sat.trailPositions[idx + 1] = y;
          sat.trailPositions[idx + 2] = z;
          sat.trailHead = (sat.trailHead + 1) % (sat.trailPositions.length / 3);
          sat.trailCount = Math.min(
            sat.trailCount + 1,
            sat.trailPositions.length / 3
          );
          const ordered = new Float32Array(sat.trailCount * 3);
          const cap = sat.trailPositions.length / 3;
          const start = sat.trailCount < cap ? 0 : sat.trailHead;
          for (let i = 0; i < sat.trailCount; i++) {
            const src = ((start + i) % cap) * 3;
            ordered[i * 3] = sat.trailPositions[src];
            ordered[i * 3 + 1] = sat.trailPositions[src + 1];
            ordered[i * 3 + 2] = sat.trailPositions[src + 2];
          }
          sat.trailGeo.setAttribute(
            "position",
            new THREE.BufferAttribute(ordered, 3)
          );
          sat.trailGeo.attributes.position.needsUpdate = true;
          sat.trailGeo.setDrawRange(0, sat.trailCount);
        }
      }

      // Target ring follows selection
      if (selectionTargetRef.current) {
        const out = new THREE.Vector3();
        selectionTargetRef.current.getWorldPos(out);
        targetRing.position.copy(out);
        targetRing.lookAt(camera.position);
        const p = 1 + 0.15 * Math.sin(performance.now() * 0.005);
        targetRing.scale.setScalar(p);
        ringMatSel.opacity =
          0.55 + 0.35 * (0.5 + 0.5 * Math.sin(performance.now() * 0.005));
        targetRing.visible = true;
      } else {
        targetRing.visible = false;
      }

      // Camera orientation
      const dir = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        Math.cos(yaw) * Math.cos(pitch)
      );
      camera.lookAt(dir);

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", onUp);
      el.removeEventListener("click", onClick);
      el.removeEventListener("touchstart", touchStart);
      el.removeEventListener("touchmove", touchMove);
      el.removeEventListener("touchend", touchEnd);
      targetRingRef.current = null;
      ringGeoSel.dispose();
      ringMatSel.dispose();
      renderer.dispose();
      starGeo.dispose();
      starMat.dispose();
      catGeo.dispose();
      catMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      localMeshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      planetMeshesRef.current = new Map();
      satellitesRef.current.forEach((s) => {
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
        s.trailGeo.dispose();
      });
      satellitesRef.current = [];
      satGroupRef.current = null;
      if (el.parentNode) el.parentNode.removeChild(el);
      if (labelEl.parentNode) labelEl.parentNode.removeChild(labelEl);
    };
  }, []);

  // Ephemeris poller
  useEffect(() => {
    const PLANET_R = 460;
    const bodies = PLANETS.map((p) => ({ id: p.id, name: p.name }));
    const byName = new Map(PLANETS.map((p) => [p.name, p]));

    let cancelled = false;

    const update = async () => {
      try {
        const time = simDateRef.current.toISOString();
        const res = await fetchPositions({ data: { time, bodies } });
        if (cancelled) return;
        for (const pos of res.positions) {
          const meta = byName.get(pos.name);
          const mesh = planetMeshesRef.current.get(meta?.id ?? "");
          if (!mesh || !meta) continue;
          const raHours = pos.ra / 15;
          const [x, y, z] = raDecToVec3(raHours, pos.dec, PLANET_R);
          mesh.position.set(x, y, z);
          mesh.userData.ra = raHours;
          mesh.userData.dec = pos.dec;
          if (pos.range) {
            // Horizons returns AU for solar system bodies; convert to km
            mesh.userData.rangeKm = pos.range * 1.496e8;
          }
        }
      } catch (err) {
        console.warn("Horizons fetch failed", err);
      }
    };

    update();
    const id = window.setInterval(update, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [fetchPositions]);

  // Satellite TLE loader
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetchSatTLEs();
        if (cancelled) return;
        const group = satGroupRef.current;
        if (!group) return;

        // Preserve dead-reckoning cache for satellites we already track
        const oldByName = new Map(satellitesRef.current.map((s) => [s.name, s]));

        satellitesRef.current.forEach((s) => {
          group.remove(s.mesh);
          s.mesh.geometry.dispose();
          (s.mesh.material as THREE.Material).dispose();
          s.trailGeo.dispose();
        });
        satellitesRef.current = [];

        const colors: Record<string, number> = {
          iss: 0x4fc3ff,
          hubble: 0xff6bd6,
        };

        for (const s of res.satellites) {
          let satrec: satellite.SatRec;
          try {
            satrec = satellite.twoline2satrec(s.line1, s.line2);
          } catch {
            continue;
          }
          const color = colors[s.id] ?? 0x6affc9;

          const geo = new THREE.SphereGeometry(2.2, 16, 16);
          const mat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.visible = false;

          const labelDiv = document.createElement("div");
          labelDiv.textContent = s.name;
          labelDiv.className =
            "px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wide text-white/95 bg-black/60 border border-white/20 backdrop-blur-sm whitespace-nowrap";
          labelDiv.style.boxShadow = `0 0 12px ${"#" + color.toString(16).padStart(6, "0")}55`;
          const label = new CSS2DObject(labelDiv);
          label.position.set(0, 6, 0);
          mesh.add(label);

          group.add(mesh);

          const MAX_TRAIL = 240;
          const trailPositions = new Float32Array(MAX_TRAIL * 3);
          const trailGeo = new THREE.BufferGeometry();
          trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
          trailGeo.setDrawRange(0, 0);
          const trailMat = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const trail = new THREE.Line(trailGeo, trailMat);
          group.add(trail);

          // Derive Space-Track metadata from TLE
          const meta = buildSatMeta(s.id, s.line1, s.line2);

          const prev = oldByName.get(s.name);

          satellitesRef.current.push({
            name: s.name,
            id: s.id,
            catnr: meta.catnr ?? "",
            satrec,
            meta,
            mesh,
            label,
            trailGeo,
            trailPositions,
            trailCount: 0,
            trailHead: 0,
            // Inherit dead-reckon cache across refreshes
            lastEciPos: prev?.lastEciPos,
            lastEciVel: prev?.lastEciVel,
            lastValidTime: prev?.lastValidTime,
          });
        }
      } catch (err) {
        console.warn("TLE fetch failed", err);
      }
    };

    load();
    const id = window.setInterval(load, 60 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [fetchSatTLEs]);

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
          <HudButton
            active={groundFilter}
            onClick={() => setGroundFilter((v) => !v)}
            icon={<Mountain className="h-4 w-4" />}
            label="Ground"
          />
          <HudButton
            active={false}
            onClick={() => setQuizOpen(true)}
            icon={<GraduationCap className="h-4 w-4" />}
            label="Quiz"
          />
        </div>
      </div>

      {/* Developer credit watermark */}
      <div className="pointer-events-none absolute bottom-2 left-3 z-10 select-none font-mono text-[10px] tracking-tight text-gray-500/80">
        Project by: Achut Mahadev Kadam &middot; krishna0124@gmail.com
      </div>

      <CelestialInfoPanel
        selection={selection}
        onClose={() => {
          setSelection(null);
          selectionTargetRef.current = null;
        }}
      />
      <QuizModal open={quizOpen} onOpenChange={setQuizOpen} />

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

/** Parse useful fields out of a TLE pair for the Space-Track tab. */
function buildSatMeta(id: string, line1: string, line2: string): SatelliteMeta {
  const meta: SatelliteMeta = {};
  try {
    meta.catnr = line1.substring(2, 7).trim();
    meta.intlDesignator = line1.substring(9, 17).trim();
    const epYear = parseInt(line1.substring(18, 20), 10);
    const epDay = parseFloat(line1.substring(20, 32));
    if (Number.isFinite(epYear) && Number.isFinite(epDay)) {
      const year = epYear < 57 ? 2000 + epYear : 1900 + epYear;
      const d = new Date(Date.UTC(year, 0, 1));
      d.setUTCMilliseconds(d.getUTCMilliseconds() + (epDay - 1) * 86400000);
      meta.epoch = d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
    }
    meta.inclinationDeg = parseFloat(line2.substring(8, 16));
    meta.eccentricity = parseFloat("0." + line2.substring(26, 33).trim());
    meta.meanMotion = parseFloat(line2.substring(52, 63));
    if (meta.meanMotion) meta.periodMinutes = 1440 / meta.meanMotion;
  } catch {
    /* ignore */
  }
  // Suppress unused warning for id while keeping the call signature explicit
  void id;
  return meta;
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
      className={`group flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
        active
          ? "bg-sky-500/30 text-sky-50 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.45)]"
          : "text-white/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// Suppress unused import warnings if any util is conditionally used
void radToDeg;
