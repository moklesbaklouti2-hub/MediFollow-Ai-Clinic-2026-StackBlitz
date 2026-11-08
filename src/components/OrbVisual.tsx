import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type OrbVisualProps = { isThinking: boolean };

const coreVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  uniform float uTime;
  uniform float uThinking;

  float wave(vec3 p) {
    return sin(p.x * 3.2 + uTime * 0.72) *
           sin(p.y * 3.7 - uTime * 0.58) *
           sin(p.z * 3.4 + uTime * 0.49);
  }

  void main() {
    vec3 p = position;
    float pulse = wave(normalize(position) * 1.7);
    float detail = sin(position.x * 11.0 + uTime) *
                   cos(position.y * 9.0 - uTime * 0.8) *
                   sin(position.z * 10.0 + uTime * 0.65);
    float displacement = pulse * (0.025 + uThinking * 0.025) + detail * 0.009;
    p += normal * displacement;
    vNormal = normalize(normalMatrix * normal);
    vPosition = p;
    vec4 worldPosition = modelMatrix * vec4(p, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const coreFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  uniform float uTime;
  uniform float uThinking;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.52;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.25);

    vec3 flow = vPosition * 3.2 + vec3(uTime * 0.23, -uTime * 0.31, uTime * 0.19);
    float clouds = fbm(flow);
    float veins = fbm(flow * 2.1 + vec3(0.0, uTime * 0.13, 0.0));
    float current = sin((vPosition.x + vPosition.y * 0.72 + clouds * 0.75) * 13.0 - uTime * (1.1 + uThinking * 1.8));
    float filament = smoothstep(0.68, 0.96, current * 0.5 + veins * 0.85);
    float innerPulse = 0.5 + 0.5 * sin(uTime * (1.35 + uThinking * 2.4) + clouds * 8.0);

    vec3 deep = vec3(0.004, 0.012, 0.035);
    vec3 teal = vec3(0.015, 0.78, 0.70);
    vec3 aqua = vec3(0.12, 0.88, 0.78);
    vec3 violet = vec3(0.58, 0.13, 0.92);
    vec3 plasma = mix(deep, teal, smoothstep(0.22, 0.72, clouds));
    plasma = mix(plasma, violet, smoothstep(0.48, 0.86, veins) * 0.82);
    plasma = mix(plasma, teal * 1.12, filament * 0.66);
    plasma += teal * (innerPulse * 0.13 + uThinking * 0.12);
    plasma += violet * fresnel * (0.48 + uThinking * 0.38);

    float alpha = 0.93 + fresnel * 0.07;
    gl_FragColor = vec4(plasma * (1.12 + fresnel * 0.75), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const ringVertexShader = `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 p = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const ringFragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  uniform float uThinking;
  void main() {
    float sweep = 0.5 + 0.5 * sin(vUv.x * 34.0 - uTime * (1.0 + uThinking * 2.0));
    float pulse = 0.55 + 0.45 * sin(uTime * (1.2 + uThinking * 2.0) + vUv.x * 12.0);
    float edge = pow(max(0.0, sin(vUv.x * 3.14159)), 0.55);
    vec3 color = mix(uColorA, uColorB, sweep);
    float alpha = uOpacity * edge * (0.36 + 0.64 * pulse);
    gl_FragColor = vec4(color * (1.25 + sweep * 0.8), alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function LivingOrb({ isThinking }: OrbVisualProps) {
  const core = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Group>(null);
  const ringB = useRef<THREE.Group>(null);
  const ringC = useRef<THREE.Group>(null);
  const particles = useRef<THREE.Group>(null);

  const coreMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uThinking: { value: 0 } },
    vertexShader: coreVertexShader,
    fragmentShader: coreFragmentShader,
    transparent: false,
    depthWrite: true,
    toneMapped: false,
  }), []);

  const ringMaterials = useMemo(() => [
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColorA: { value: new THREE.Color('#35f3dc') }, uColorB: { value: new THREE.Color('#67f5df') }, uOpacity: { value: 0.92 }, uThinking: { value: 0 } },
      vertexShader: ringVertexShader, fragmentShader: ringFragmentShader, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    }),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColorA: { value: new THREE.Color('#a36bff') }, uColorB: { value: new THREE.Color('#c49aff') }, uOpacity: { value: 0.88 }, uThinking: { value: 0 } },
      vertexShader: ringVertexShader, fragmentShader: ringFragmentShader, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    }),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColorA: { value: new THREE.Color('#42bfff') }, uColorB: { value: new THREE.Color('#65d9ef') }, uOpacity: { value: 0.56 }, uThinking: { value: 0 } },
      vertexShader: ringVertexShader, fragmentShader: ringFragmentShader, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    }),
  ], []);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const thinking = isThinking ? 1 : 0;
    coreMaterial.uniforms.uTime.value = t;
    coreMaterial.uniforms.uThinking.value = THREE.MathUtils.damp(coreMaterial.uniforms.uThinking.value, thinking, 3.0, delta);
    ringMaterials.forEach((material) => {
      material.uniforms.uTime.value = t;
      material.uniforms.uThinking.value = THREE.MathUtils.damp(material.uniforms.uThinking.value, thinking, 3.0, delta);
    });

    if (core.current) {
      const breath = 1 + Math.sin(t * (isThinking ? 3.4 : 1.05)) * (isThinking ? 0.055 : 0.032);
      core.current.scale.setScalar(breath);
      core.current.rotation.y = t * (isThinking ? 0.24 : 0.09);
      core.current.rotation.x = Math.sin(t * 0.31) * 0.055;
    }
    if (ringA.current) {
      ringA.current.rotation.set(0.76 + Math.sin(t * 0.43) * 0.08, 0.18, t * (isThinking ? 0.62 : 0.22));
      ringA.current.scale.setScalar(1 + Math.sin(t * 1.1) * 0.025);
    }
    if (ringB.current) {
      ringB.current.rotation.set(-0.86, t * (isThinking ? -0.48 : -0.17), 0.35 + Math.sin(t * 0.29) * 0.13);
    }
    if (ringC.current) {
      ringC.current.rotation.set(t * (isThinking ? 0.36 : 0.12), 0.82 + Math.sin(t * 0.36) * 0.12, 0.18);
      ringC.current.scale.setScalar(1 + Math.sin(t * 0.78 + 1.3) * 0.045);
    }
    if (particles.current) {
      particles.current.rotation.y = t * (isThinking ? 0.32 : 0.12);
      particles.current.rotation.x = Math.sin(t * 0.25) * 0.12;
    }
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <pointLight position={[2.4, 2.1, 2.5]} intensity={3.2} color="#8dfff0" />
      <pointLight position={[-2.1, -1.2, 1.8]} intensity={3.0} color="#a56bff" />
      <pointLight position={[0, 0, -2]} intensity={1.6} color="#268dff" />

      <mesh ref={core} material={coreMaterial}>
        <sphereGeometry args={[0.78, 96, 96]} />
      </mesh>

      <mesh scale={1.025}>
        <sphereGeometry args={[0.78, 48, 48]} />
        <meshBasicMaterial color="#8cfff0" transparent opacity={0.045} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <group ref={ringA}>
        <mesh material={ringMaterials[0]}>
          <torusGeometry args={[1.01, 0.022, 12, 180]} />
        </mesh>
        <mesh material={ringMaterials[0]} scale={0.985}>
          <torusGeometry args={[1.01, 0.008, 8, 180]} />
        </mesh>
      </group>
      <group ref={ringB}>
        <mesh material={ringMaterials[1]}>
          <torusGeometry args={[1.13, 0.018, 12, 180]} />
        </mesh>
      </group>
      <group ref={ringC}>
        <mesh material={ringMaterials[2]}>
          <torusGeometry args={[0.91, 0.012, 10, 180]} />
        </mesh>
      </group>

      <group ref={particles}>
        {Array.from({ length: 18 }, (_, i) => {
          const angle = (i / 18) * Math.PI * 2;
          const radius = 1.18 + (i % 4) * 0.075;
          const y = Math.sin(angle * 2.3) * 0.68;
          return (
            <mesh key={i} position={[Math.cos(angle) * radius, y, Math.sin(angle) * radius * 0.62]}>
              <sphereGeometry args={[i % 4 === 0 ? 0.022 : 0.012, 10, 10]} />
              <meshBasicMaterial color={i % 2 === 0 ? '#a5fff1' : '#c5a2ff'} toneMapped={false} />
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
      dpr={[1, 1.35]}
      camera={{ position: [0, 0, 3.65], fov: 42 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      fallback={<div className="mf-orb-fallback" />}
    >
      <LivingOrb isThinking={isThinking} />
    </Canvas>
  );
}
