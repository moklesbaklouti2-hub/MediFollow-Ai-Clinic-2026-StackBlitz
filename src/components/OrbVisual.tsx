import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

type OrbVisualProps = { isThinking: boolean };

function LivingOrb({ isThinking }: OrbVisualProps) {
  const core = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Group>(null);
  const ringB = useRef<THREE.Group>(null);
  const ringC = useRef<THREE.Group>(null);
  const particles = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (core.current) {
      const breath = 1 + Math.sin(t * (isThinking ? 3.1 : 1.35)) * (isThinking ? 0.055 : 0.028);
      core.current.scale.setScalar(breath);
      core.current.rotation.y += delta * (isThinking ? 0.8 : 0.16);
      core.current.rotation.x = Math.sin(t * 0.42) * 0.08;
    }
    if (ringA.current) {
      ringA.current.rotation.z += delta * (isThinking ? 1.55 : 0.34);
      ringA.current.rotation.x = 0.72 + Math.sin(t * 0.72) * 0.2;
      ringA.current.scale.setScalar(1 + Math.sin(t * 1.1) * 0.035);
    }
    if (ringB.current) {
      ringB.current.rotation.y += delta * (isThinking ? -1.25 : -0.25);
      ringB.current.rotation.x = -0.82 + Math.cos(t * 0.58) * 0.18;
      ringB.current.rotation.z = Math.sin(t * 0.36) * 0.22;
    }
    if (ringC.current) {
      ringC.current.rotation.x += delta * (isThinking ? 1.05 : 0.2);
      ringC.current.rotation.y = 0.8 + Math.sin(t * 0.5) * 0.3;
    }
    if (particles.current) {
      particles.current.rotation.y += delta * (isThinking ? 0.7 : 0.16);
      particles.current.rotation.x = Math.sin(t * 0.3) * 0.16;
    }
  });

  const ringMaterial = (color: string, opacity: number) => (
    <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
  );

  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[2.5, 2.5, 3]} intensity={3.4} color="#9ffff0" />
      <pointLight position={[-2.5, -1.2, 1.5]} intensity={3.1} color="#a66cff" />
      <pointLight position={[0, 0, -2]} intensity={1.8} color="#258dff" />

      <mesh ref={core}>
        <icosahedronGeometry args={[0.78, 5]} />
        <MeshDistortMaterial
          color={isThinking ? '#9b78ff' : '#54e8d0'}
          emissive={isThinking ? '#5124b5' : '#087e78'}
          emissiveIntensity={isThinking ? 1.5 : 0.85}
          roughness={0.19}
          metalness={0.28}
          distort={isThinking ? 0.42 : 0.3}
          speed={isThinking ? 3.1 : 0.8}
        />
      </mesh>

      <mesh scale={0.91}>
        <sphereGeometry args={[0.78, 48, 48]} />
        <meshBasicMaterial color="#a5fff0" transparent opacity={0.075} side={THREE.BackSide} />
      </mesh>

      <group ref={ringA}>
        <mesh>
          <torusGeometry args={[1.02, 0.018, 10, 120]} />
          {ringMaterial('#7affeb', 0.95)}
        </mesh>
        <mesh rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[1.02, 0.007, 8, 120]} />
          {ringMaterial('#e4fff9', 0.72)}
        </mesh>
      </group>
      <group ref={ringB}>
        <mesh>
          <torusGeometry args={[1.13, 0.014, 10, 120]} />
          {ringMaterial('#b58aff', 0.94)}
        </mesh>
      </group>
      <group ref={ringC}>
        <mesh>
          <torusGeometry args={[0.91, 0.009, 8, 120]} />
          {ringMaterial('#48caff', 0.7)}
        </mesh>
      </group>

      <group ref={particles}>
        {Array.from({ length: 9 }, (_, i) => {
          const angle = (i / 9) * Math.PI * 2;
          const radius = 1.22 + (i % 3) * 0.09;
          return (
            <mesh key={i} position={[Math.cos(angle) * radius, Math.sin(angle * 1.7) * 0.72, Math.sin(angle) * radius * 0.58]}>
              <sphereGeometry args={[i % 3 === 0 ? 0.027 : 0.016, 12, 12]} />
              <meshBasicMaterial color={i % 2 === 0 ? '#a6fff0' : '#c4a0ff'} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
    </>
  );
}

export default function OrbVisual({ isThinking }: OrbVisualProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 3.8], fov: 42 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      fallback={<div className="mf-orb-fallback" />}
    >
      <LivingOrb isThinking={isThinking} />
    </Canvas>
  );
}
