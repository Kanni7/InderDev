import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { getAstronomicalMoonGeometry } from "./astronomy";

export interface RealisticMoonProps {
  date?: Date; // Selected date/time (continuous)
  phase?: number; // 0..1 (optional if date is passed)
  size?: number; // width/height in px
  className?: string;
  showLimbSheen?: boolean;
  interactive?: boolean;
}

/**
 * Computes deterministic astronomical orientation & solar direction
 * - Near side is anchored toward Earth (+Z)
 * - Optical libration in longitude (yaw) & latitude (pitch)
 * - Lunar polar axis tilt (roll)
 * - Directional sunlight vector from Sun-Moon elongation & declination
 */
function computeAstronomicalTarget(targetDate?: Date, fallbackPhase = 0.5) {
  if (targetDate) {
    const geo = getAstronomicalMoonGeometry(targetDate);
    const euler = new THREE.Euler(
      geo.librationLat,
      -Math.PI / 2 + geo.librationLon,
      geo.axisTilt,
      "YXZ"
    );
    const quat = new THREE.Quaternion().setFromEuler(euler);
    const sunDir = new THREE.Vector3(
      geo.sunDirection[0],
      geo.sunDirection[1],
      geo.sunDirection[2]
    ).normalize();
    return { quat, sunDir, phase: geo.phase, illumination: geo.illumination };
  } else {
    const p = fallbackPhase;
    const sunAngle = (p - 0.5) * Math.PI * 2;
    const euler = new THREE.Euler(0, -Math.PI / 2, 0.035, "YXZ");
    const quat = new THREE.Quaternion().setFromEuler(euler);
    const sunDir = new THREE.Vector3(
      -Math.sin(sunAngle),
      Math.sin(0.08),
      Math.cos(sunAngle)
    ).normalize();
    return {
      quat,
      sunDir,
      phase: p,
      illumination: Math.round(((1 - Math.cos(p * 2 * Math.PI)) / 2) * 100),
    };
  }
}

/**
 * RealisticMoon Component
 * Renders an authentic physical 3D Moon model driven by astronomical ephemeris:
 * - Real 3D Sphere geometry with NASA lunar surface texture & crater bump mapping.
 * - Deterministic orientation driven by astronomical libration and axial tilt (stable lunar coordinate system).
 * - Dynamic 3D DirectionalLight (the Sun) accurately positioned in 3D celestial space.
 * - Smooth quaternion slerp and vector lerp for continuous, fluid timeline scrubbing.
 * - 100% transparent canvas (alpha: true) - ZERO black boxes or borders.
 * - Smooth interactive touch/mouse drag for crater inspection, gently springing back to astronomical orientation on release.
 */
export function RealisticMoon({
  date,
  phase,
  size = 135,
  className = "",
  showLimbSheen = true,
  interactive = true,
}: RealisticMoonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglSupported, setWebglSupported] = useState(true);

  // Keep refs to latest date and phase for continuous 60fps animation without re-mounting
  const dateRef = useRef<Date | undefined>(date);
  dateRef.current = date;

  const phaseRef = useRef<number | undefined>(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    let destroyed = false;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup: Field of view 32° for realistic telescopic perspective
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 3.8);

    // 3. Renderer with transparent background (alpha: true)
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglSupported(false);
      return;
    }

    renderer.setClearColor(0x000000, 0); // Completely transparent background
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // 4. Physical 3D Lighting Setup
    // Sun Directional Light (illuminates the lunar phase)
    const sunLight = new THREE.DirectionalLight(0xfff7ee, 3.2);
    scene.add(sunLight);

    // Earthshine: Soft bluish-gray light reflected from Earth onto dark hemisphere
    const earthshineLight = new THREE.DirectionalLight(0x7da4d4, 0.18);
    earthshineLight.position.set(0, 0, 5);
    scene.add(earthshineLight);

    // Deep cosmic ambient light so craters on shadowed side have 3D relief
    const ambientLight = new THREE.AmbientLight(0x182438, 0.08);
    scene.add(ambientLight);

    // Subtle cool-white rim light for limb definition
    if (showLimbSheen) {
      const rimLight = new THREE.DirectionalLight(0xdbeafe, 0.22);
      rimLight.position.set(0, 2.5, -3.5);
      scene.add(rimLight);
    }

    // 5. 3D Moon Mesh setup
    const segments = size > 60 ? 64 : 32;
    const geometry = new THREE.SphereGeometry(1, segments, segments);
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(
      "/moon_1024.jpg",
      () => {
        if (destroyed) return;
        material.needsUpdate = true;
      }
    );
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      bumpMap: texture,
      bumpScale: 0.045, // Real 3D crater depth
      roughness: 0.92,  // Matte lunar regolith
      metalness: 0.02,
    });

    const baseRotY = -Math.PI / 2;
    const baseRotZ = 0.035; // Lunar axial tilt (1.54°)

    const moonMesh = new THREE.Mesh(geometry, material);
    scene.add(moonMesh);

    // 6. Astronomical Orientation & Solar Vector state
    const sunDist = 9.0;
    const targetQuat = new THREE.Quaternion();
    const currentQuat = new THREE.Quaternion();
    const targetSunDir = new THREE.Vector3();
    const currentSunDir = new THREE.Vector3();
    const manualQuat = new THREE.Quaternion();
    const combinedQuat = new THREE.Quaternion();

    // Initialize immediate state to avoid any initial frame pop
    const initialTarget = computeAstronomicalTarget(dateRef.current, phaseRef.current ?? 0.5);
    targetQuat.copy(initialTarget.quat);
    currentQuat.copy(initialTarget.quat);
    targetSunDir.copy(initialTarget.sunDir);
    currentSunDir.copy(initialTarget.sunDir);

    moonMesh.quaternion.copy(currentQuat);
    sunLight.position.copy(currentSunDir).multiplyScalar(sunDist);

    // 7. Interactive 3D touch/drag rotation state (for direct model inspection)
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let manualPitch = 0;
    let manualYaw = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (!interactive) return;
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || !interactive) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      manualYaw += dx * 0.012;
      manualPitch += dy * 0.01;
      manualPitch = Math.max(-0.65, Math.min(0.65, manualPitch));
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    // 8. Continuous Animation Loop with Quaternion Slerp & Vector Lerp
    const animate = () => {
      if (destroyed) return;
      animId = requestAnimationFrame(animate);

      // A. Continuously calculate astronomical targets for latest scrubbed date
      const target = computeAstronomicalTarget(dateRef.current, phaseRef.current ?? 0.5);
      targetQuat.copy(target.quat);
      targetSunDir.copy(target.sunDir);

      // B. Smooth quaternion slerp towards deterministic astronomical orientation
      // Slerp factor 0.15 gives instant 60fps tracking during scrubs and gentle settling when scrubbing halts
      currentQuat.slerp(targetQuat, 0.15);

      // C. Smooth solar direction vector lerp (moves terminator boundary across craters)
      currentSunDir.lerp(targetSunDir, 0.15).normalize();
      sunLight.position.copy(currentSunDir).multiplyScalar(sunDist);

      // D. Combine with manual touch inspection offset (springs back to astronomical home orientation)
      if (interactive) {
        if (!isDragging) {
          manualPitch *= 0.92;
          manualYaw *= 0.92;
        }
        const dragEuler = new THREE.Euler(manualPitch, manualYaw, 0, "YXZ");
        manualQuat.setFromEuler(dragEuler);
        combinedQuat.copy(currentQuat).multiply(manualQuat);
        moonMesh.quaternion.copy(combinedQuat);
      } else {
        moonMesh.quaternion.copy(currentQuat);
      }

      renderer.render(scene, camera);
    };

    animate();

    // 8. Cleanup
    return () => {
      destroyed = true;
      cancelAnimationFrame(animId);

      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);

      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    };
  }, [size, interactive, showLimbSheen]);

  // Update canvas size if size prop changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    }
  }, [size]);

  if (!webglSupported) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-white/5 ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-[32px]">🌙</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center justify-center select-none bg-transparent ${
        interactive ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"
      } ${className}`}
      style={{
        width: size,
        height: size,
        background: "transparent",
      }}
      title={interactive ? "Drag to rotate 3D Moon Model" : undefined}
      aria-label={`3D Moon Model ${((phase ?? 0) * 100).toFixed(0)}% illuminated`}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className={`${interactive ? "pointer-events-auto" : "pointer-events-none"} block bg-transparent`}
        style={{
          width: size,
          height: size,
          background: "transparent",
        }}
      />
    </div>
  );
}
