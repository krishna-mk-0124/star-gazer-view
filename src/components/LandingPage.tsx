import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";

export default function LandingPage({ onLaunch }: { onLaunch: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x02030a);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 0.6, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Starfield
    const starCount = 4000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 400 + Math.random() * 200;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.4,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Earth
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const earthGeo = new THREE.SphereGeometry(1.4, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x2c6ea8,
      roughness: 0.85,
      metalness: 0.05,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earth);

    const texLoader = new THREE.TextureLoader();
    texLoader.setCrossOrigin("anonymous");
    texLoader.load(
      "https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/earthmap1k.jpg",
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        earthMat.map = tex;
        earthMat.color.set(0xffffff);
        earthMat.needsUpdate = true;
      }
    );

    // Atmosphere glow
    const atmoGeo = new THREE.SphereGeometry(1.55, 64, 64);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x4fc3ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    earthGroup.add(new THREE.Mesh(atmoGeo, atmoMat));

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(5, 2, 4);
    scene.add(sun);

    // Satellite orbits (rings + moving dots)
    type Orbit = { ring: THREE.Line; dot: THREE.Mesh; tilt: THREE.Euler; speed: number; phase: number; radius: number };
    const orbits: Orbit[] = [];
    const ringColors = [0x4fc3ff, 0xff6bd6, 0x6affc9];
    for (let i = 0; i < 3; i++) {
      const radius = 2 + i * 0.45;
      const pts: THREE.Vector3[] = [];
      for (let a = 0; a <= 128; a++) {
        const t = (a / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const ringMat = new THREE.LineBasicMaterial({
        color: ringColors[i],
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Line(ringGeo, ringMat);
      const tilt = new THREE.Euler(
        (Math.random() - 0.5) * 1.2,
        Math.random() * Math.PI,
        (Math.random() - 0.5) * 1.2
      );
      ring.rotation.copy(tilt);

      const dotGeo = new THREE.SphereGeometry(0.05, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({
        color: ringColors[i],
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);

      scene.add(ring);
      scene.add(dot);
      orbits.push({
        ring,
        dot,
        tilt,
        speed: 0.4 + i * 0.2,
        phase: Math.random() * Math.PI * 2,
        radius,
      });
    }

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
      const t = clock.elapsedTime;
      earth.rotation.y += dt * 0.12;
      stars.rotation.y += dt * 0.005;

      for (const o of orbits) {
        const angle = o.phase + t * o.speed;
        const local = new THREE.Vector3(
          Math.cos(angle) * o.radius,
          0,
          Math.sin(angle) * o.radius
        );
        local.applyEuler(o.tilt);
        o.dot.position.copy(local);
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      starGeo.dispose();
      starMat.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      for (const o of orbits) {
        o.ring.geometry.dispose();
        (o.ring.material as THREE.Material).dispose();
        o.dot.geometry.dispose();
        (o.dot.material as THREE.Material).dispose();
      }
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black text-white">
      <div ref={containerRef} className="absolute inset-0" />
      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)]" />

      {/* Centered glass card */}
      <div className="relative z-10 flex h-full w-full items-center justify-center px-6">
        <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 px-8 py-10 text-center shadow-[0_0_80px_rgba(79,195,255,0.15)] backdrop-blur-2xl sm:px-12 sm:py-14">
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
              onClick={onLaunch}
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

      {/* Footer credit */}
      <div className="absolute bottom-3 left-0 right-0 z-10 text-center font-mono text-[10px] text-gray-500">
        Project by: Achut Mahadev Kadam · krishna0124@gmail.com
      </div>
    </div>
  );
}
