"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createBillTexture } from "./bill-texture";

type Bill = {
  x: number;
  y: number;
  z: number;
  speed: number;
  scale: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  sway: number;
  swaySpeed: number;
  offset: number;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function makeBillGeometry() {
  const geometry = new THREE.PlaneGeometry(2.35, 1.03, 10, 4);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    position.setZ(index, Math.sin(x * 0.85) * 0.045 + Math.cos(y * 1.5) * 0.025);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function BillField({ count, reduced }: { count: number; reduced: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geometry = useMemo(() => makeBillGeometry(), []);
  const texture = useMemo(() => (typeof document === "undefined" ? null : createBillTexture()), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture ?? undefined,
        color: texture ? "#ffffff" : "#b7e2ad",
        side: THREE.DoubleSide,
        roughness: 0.58,
        metalness: 0.12,
        emissive: new THREE.Color("#3f8f6a"),
        emissiveIntensity: 0.08,
        transparent: true,
        opacity: 0.93,
      }),
    [texture]
  );

  const billsRef = useRef<Bill[]>([]);

  useEffect(() => {
    billsRef.current = Array.from({ length: count }, () => ({
      x: rand(-8.5, 8.5),
      y: rand(-9, 12),
      z: rand(-7, 3.5),
      speed: rand(0.9, 2.4),
      scale: rand(0.62, 1.4),
      rotX: rand(-0.8, 0.8),
      rotY: rand(-1.4, 1.4),
      rotZ: rand(-0.9, 0.9),
      sway: rand(0.25, 0.9),
      swaySpeed: rand(0.24, 0.6),
      offset: rand(0, Math.PI * 2),
    }));
  }, [count]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      texture?.dispose();
    };
  }, [geometry, material, texture]);

  const { pointer } = useThree();

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const bills = billsRef.current;

    if (groupRef.current && !reduced) {
      groupRef.current.rotation.y += (pointer.x * 0.14 - groupRef.current.rotation.y) * 0.035;
      groupRef.current.rotation.x += (-pointer.y * 0.1 - groupRef.current.rotation.x) * 0.035;
    }

    for (let index = 0; index < bills.length; index += 1) {
      const bill = bills[index];
      if (!reduced) {
        bill.y -= bill.speed * dt;
        if (bill.y < -10) {
          bill.y = rand(10, 15);
          bill.x = rand(-8.5, 8.5);
          bill.z = rand(-7, 3.5);
          bill.speed = rand(0.9, 2.4);
          bill.scale = rand(0.62, 1.4);
        }
      }

      const sway = reduced ? 0 : Math.sin(time * bill.swaySpeed + bill.offset) * bill.sway;
      const drift = reduced ? 0 : Math.cos(time * bill.swaySpeed * 0.7 + bill.offset) * 0.25;
      dummy.position.set(bill.x + sway, bill.y + drift, bill.z);
      dummy.rotation.set(
        bill.rotX + (reduced ? 0 : Math.sin(time * 0.22 + bill.offset) * 0.16),
        bill.rotY + (reduced ? 0 : time * 0.1 * (index % 2 === 0 ? 1 : -1)),
        bill.rotZ + (reduced ? 0 : Math.sin(time * 0.16 + bill.offset) * 0.08)
      );
      dummy.scale.setScalar(bill.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(index, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} />
    </group>
  );
}

function Dust({ reduced }: { reduced: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const buffer = new Float32Array(240 * 3);
    for (let index = 0; index < 240; index += 1) {
      buffer[index * 3] = rand(-12, 12);
      buffer[index * 3 + 1] = rand(-9, 10);
      buffer[index * 3 + 2] = rand(-10, 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(buffer, 3));
    return geo;
  }, []);
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#67e8f9",
        size: 0.035,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame((state, delta) => {
    if (!pointsRef.current || reduced) return;
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.018;
    pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.25;
    pointsRef.current.rotation.z += delta * 0.002;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

export function MoneyRainCanvas({ density = 22 }: { density?: number }) {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const count =
    typeof window !== "undefined" && window.innerWidth < 768 ? Math.max(10, Math.round(density * 0.6)) : density;

  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 46, near: 0.1, far: 40 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      frameloop="always"
    >
      <fog attach="fog" args={["#06060b", 9, 26]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[4, 7, 6]} intensity={2} color="#e4f7ea" />
      <pointLight position={[-6, 3, 4]} intensity={36} distance={22} color="#8b5cf6" />
      <pointLight position={[7, -3, 5]} intensity={28} distance={22} color="#22d3ee" />
      <BillField count={count} reduced={reduced} />
      <Dust reduced={reduced} />
    </Canvas>
  );
}
