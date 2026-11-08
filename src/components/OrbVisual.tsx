import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type OrbVisualProps = { isThinking: boolean };

const noiseFunctions = `
  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash31(i), hash31(i + vec3(1.0,0.0,0.0)), f.x),
          mix(hash31(i + vec3(0.0,1.0,0.0)), hash31(i + vec3(1.0,1.0,0.0)), f.x), f.y),
      mix(mix(hash31(i + vec3(0.0,0.0,1.0)), hash31(i + vec3(1.0,0.0,1.0)), f.x),
          mix(hash31(i + vec3(0.0,1.0,1.0)), hash31(i + vec3(1.0,1.0,1.0)), f.x), f.y), f.z);
  }
  float fbm3(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      sum += noise3(p) * amp;
      p = p * 2.02 + 0.17;
      amp *= 0.5;
    }
    return sum;
  }
`;

const coreVertexShader = `
  varying vec3 vLocal;
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vLocal = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const coreFragmentShader = `
  varying vec3 vLocal;
  varying vec3 vWorld;
  varying vec3 vNormal;
  uniform float uTime;
  uniform float uThinking;
  ${noiseFunctions}
  void main() {
    vec3 p = normalize(vLocal);
    float speed = 0.18 + uThinking * 0.28;
    vec3 drift = vec3(uTime * speed, -uTime * speed * 0.72, uTime * speed * 0.55);
    vec3 warp = vec3(fbm3(p * 3.0 + drift), fbm3(p * 3.0 + drift + 7.1), fbm3(p * 3.0 + drift + 13.7));
    vec3 q = p * 5.2 + (warp - 0.5) * 3.8;
    float cloud = fbm3(q + drift * 1.7);
    float detail = fbm3(q * 2.5 - drift * 1.2);
    float wave = sin((q.x * 1.7 + q.y * 2.3 - q.z * 1.4) * 4.2 + cloud * 9.0 - uTime * (1.15 + uThinking * 1.8));
    float filaments = pow(1.0 - abs(wave), 12.0) * smoothstep(0.34, 0.72, detail);
    float currents = smoothstep(0.43, 0.72, cloud) * 0.85 + filaments * 0.9;
    vec3 cyan = vec3(0.015, 0.72, 0.68);
    vec3 violet = vec3(0.42, 0.055, 0.82);
    vec3 color = vec3(0.0015, 0.004, 0.014);
    color += cyan * currents * (0.45 + smoothstep(0.38, 0.76, fbm3(q * 0.72 + drift)) * 0.75);
    color += violet * smoothstep(0.43, 0.76, detail) * (0.28 + filaments * 0.8);
    color += cyan * filaments * 0.55;
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float rim = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.6);
    color += mix(cyan, violet, 0.48) * rim * 0.75;
    float pulse = 0.86 + 0.14 * sin(uTime * (1.2 + uThinking * 2.0) + cloud * 8.0);
    gl_FragColor = vec4(color * pulse * 1.75, 1.0);
  }
`;

const plasmaVertexShader = `
  varying vec3 vLocal;
  varying vec3 vWorld;
  varying vec3 vNormal;
  uniform float uTime;
  uniform float uThinking;
  ${noiseFunctions}
  void main() {
    vec3 direction = normalize(position);
    float n1 = fbm3(direction * 4.2 + vec3(0.0, uTime * 0.22, -uTime * 0.16));
    float n2 = fbm3(direction * 8.0 - vec3(uTime * 0.19, 0.0, uTime * 0.13));
    float tongues = pow(max(0.0, n1 * 0.72 + n2 * 0.38 - 0.43), 1.35);
    float ripple = sin(direction.x * 8.0 + direction.y * 6.0 - uTime * 0.7) * sin(direction.z * 7.0 + uTime * 0.55);
    float displacement = 0.055 + tongues * (0.22 + uThinking * 0.08) + ripple * 0.018;
    vec3 p = direction * (0.88 + displacement);
    vLocal = direction;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(normalMatrix * direction);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const plasmaFragmentShader = `
  varying vec3 vLocal;
  varying vec3 vWorld;
  varying vec3 vNormal;
  uniform float uTime;
  uniform float uThinking;
  ${noiseFunctions}
  void main() {
    vec3 d = normalize(vLocal);
    float t = uTime * (0.24 + uThinking * 0.38);
    vec3 flow = d * 6.5 + vec3(t, -t * 0.8, t * 0.62);
    vec3 warp = vec3(fbm3(flow + 2.0), fbm3(flow + 8.0), fbm3(flow + 14.0));
    vec3 q = flow + (warp - 0.5) * 4.8;
    float smoke = fbm3(q * 1.35);
    float ridges = 1.0 - abs(fbm3(q * 2.2) * 2.0 - 1.0);
    float stream = pow(max(0.0, ridges - 0.34), 2.3) * smoothstep(0.28, 0.66, smoke);
    float flare = smoothstep(0.48, 0.78, smoke) * (0.35 + stream);
    vec3 cyan = vec3(0.025, 0.82, 0.76);
    vec3 purple = vec3(0.58, 0.10, 0.95);
    vec3 color = mix(cyan, purple, smoothstep(0.34, 0.72, fbm3(q * 0.72 + 4.0)));
    color *= 0.35 + flare * 1.5 + stream * 1.8;
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float edge = pow(1.0 - abs(dot(normalize(vNormal), viewDir)), 1.6);
    float alpha = clamp((flare * 0.55 + stream * 0.95) * (0.45 + edge * 0.8), 0.0, 0.92);
    gl_FragColor = vec4(color, alpha);
  }
`;

const ringVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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
    gl_FragColor = vec4(color * (1.25 + sweep * 0.8), uOpacity * edge * (0.36 + 0.64 * pulse));
  }
`;

function LivingOrb({ isThinking }: OrbVisualProps) {
  const core = useRef<THREE.Mesh>(null);
  const plasmaShell = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Group>(null);
  const ringB = useRef<THREE.Group>(null);
  const ringC = useRef<THREE.Group>(null);
  const particles = useRef<THREE.Group>(null);

  const coreMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uThinking: { value: 0 } },
    vertexShader: coreVertexShader, fragmentShader: coreFragmentShader,
    transparent: false, depthWrite: true, toneMapped: false,
  }), []);

  const plasmaMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uThinking: { value: 0 } },
    vertexShader: plasmaVertexShader, fragmentShader: plasmaFragmentShader,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false,
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
    const speed = isThinking ? 1.7 : 1.0;
    [coreMaterial, plasmaMaterial, ...ringMaterials].forEach((material) => {
      material.uniforms.uTime.value = t;
      material.uniforms.uThinking.value = THREE.MathUtils.damp(material.uniforms.uThinking.value, thinking, 3.0, delta);
    });
    if (core.current) {
      const breath = 1 + Math.sin(t * (isThinking ? 3.4 : 1.05)) * (isThinking ? 0.045 : 0.026);
      core.current.scale.setScalar(breath);
      core.current.rotation.y = t * 0.11 * speed;
      core.current.rotation.x = Math.sin(t * 0.27) * 0.045;
    }
    if (plasmaShell.current) {
      plasmaShell.current.rotation.y = -t * 0.075 * speed;
      plasmaShell.current.rotation.x = Math.sin(t * 0.21) * 0.06;
      plasmaShell.current.scale.setScalar(1 + Math.sin(t * (isThinking ? 2.8 : 0.9)) * 0.018);
    }
    if (ringA.current) {
      ringA.current.rotation.set(0.76 + Math.sin(t * 0.43) * 0.08, 0.18, t * (isThinking ? 0.62 : 0.22));
      ringA.current.scale.setScalar(1 + Math.sin(t * 1.1) * 0.025);
    }
    if (ringB.current) ringB.current.rotation.set(-0.86, t * (isThinking ? -0.48 : -0.17), 0.35 + Math.sin(t * 0.29) * 0.13);
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
      <ambientLight intensity={0.28} />
      <pointLight position={[2.4, 2.1, 2.5]} intensity={1.8} color="#36e8d4" />
      <pointLight position={[-2.1, -1.2, 1.8]} intensity={1.7} color="#934bff" />
      <mesh ref={core} material={coreMaterial}>
        <sphereGeometry args={[0.78, 96, 96]} />
      </mesh>
      <mesh ref={plasmaShell} material={plasmaMaterial} renderOrder={2}>
        <sphereGeometry args={[0.78, 96, 96]} />
      </mesh>
      <group ref={ringA}>
        <mesh material={ringMaterials[0]}><torusGeometry args={[1.01, 0.022, 12, 180]} /></mesh>
        <mesh material={ringMaterials[0]} scale={0.985}><torusGeometry args={[1.01, 0.008, 8, 180]} /></mesh>
      </group>
      <group ref={ringB}>
        <mesh material={ringMaterials[1]}><torusGeometry args={[1.13, 0.018, 12, 180]} /></mesh>
      </group>
      <group ref={ringC}>
        <mesh material={ringMaterials[2]}><torusGeometry args={[0.91, 0.012, 10, 180]} /></mesh>
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
    <Canvas dpr={[1, 1.35]} camera={{ position: [0, 0, 3.65], fov: 42 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      fallback={<div className="mf-orb-fallback" />}>
      <LivingOrb isThinking={isThinking} />
    </Canvas>
  );
}
