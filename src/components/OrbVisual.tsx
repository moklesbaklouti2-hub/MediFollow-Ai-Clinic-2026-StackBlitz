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
    vNormal = normalize(mat3(modelMatrix) * normal);
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
    vec3 waveSourceA = normalize(vec3(0.35, 0.72, 0.60));
    vec3 waveSourceB = normalize(vec3(-0.68, -0.24, 0.69));
    float waveDistanceA = acos(clamp(dot(p, waveSourceA), -1.0, 1.0));
    float waveDistanceB = acos(clamp(dot(p, waveSourceB), -1.0, 1.0));
    float waveOut = sin(waveDistanceA * 8.2 - uTime * 0.56);
    float waveIn = sin(waveDistanceB * 7.1 + uTime * 0.43);
    float livingWave = waveOut * 0.58 + waveIn * 0.42;
    float motionTime = uTime * (1.0 - uThinking * 0.84);
    float speed = 0.12 - uThinking * 0.055;
    vec3 drift = vec3(motionTime * speed, -motionTime * speed * 0.73, motionTime * speed * 0.49);
    vec3 warp = vec3(fbm3(p * 2.8 + drift), fbm3(p * 2.8 + drift + 7.1), fbm3(p * 2.8 + drift + 13.7));
    vec3 q = p * 5.2 + (warp - 0.5) * 3.4 + p * livingWave * uThinking * 0.12;
    float cloud = fbm3(q + drift * 1.3);
    float detail = fbm3(q * 2.1 - drift * 0.9);
    float deepCloud = fbm3(p * 3.1 + drift * 0.42 + warp * 1.8);
    float fineCloud = fbm3(p * 8.4 - drift * 0.68 + warp * 2.6);
    float plasmaMass = smoothstep(0.30, 0.70, deepCloud * 0.68 + cloud * 0.32);
    float innerVeil = smoothstep(0.28, 0.72, fineCloud * 0.56 + detail * 0.44);
    float flowA = dot(q, vec3(1.35, 2.1, -1.25)) * 3.6 + cloud * 8.0 - motionTime * (0.48 - uThinking * 0.22);
    float flowB = dot(q, vec3(-1.8, 0.75, 1.65)) * 3.1 - detail * 7.2 + motionTime * 0.48;
    float flowC = dot(q, vec3(0.6, -1.9, 1.2)) * 5.0 + cloud * 5.0 + motionTime * 0.34;
    float flowD = dot(q, vec3(-1.1, -1.5, 1.8)) * 2.7 + deepCloud * 9.0 - motionTime * 0.26;
    float strandA = pow(max(0.0, 1.0 - abs(sin(flowA))), 13.0) * smoothstep(0.37, 0.69, detail);
    float strandB = pow(max(0.0, 1.0 - abs(sin(flowB))), 17.0) * smoothstep(0.40, 0.72, cloud);
    float strandC = pow(max(0.0, 1.0 - abs(sin(flowC))), 22.0) * smoothstep(0.47, 0.76, detail);
    float strandD = pow(max(0.0, 1.0 - abs(sin(flowD))), 9.0) * smoothstep(0.38, 0.68, fineCloud);
    float cyanField = smoothstep(0.27, 0.62, cloud);
    float violetField = smoothstep(0.20, 0.58, detail) * (0.72 + 0.28 * sin(q.y * 1.8 + motionTime * 0.18));
    float energy = strandA * 0.82 + strandB * 0.68 + strandC * 0.48 + strandD * 0.38;
    vec3 deepBlack = vec3(0.002, 0.004, 0.014);
    vec3 cyan = vec3(0.025, 0.82, 0.78);
    vec3 turquoise = vec3(0.018, 0.62, 0.70);
    vec3 violet = vec3(0.78, 0.28, 1.0);
    vec3 basePlasma = mix(turquoise, violet, smoothstep(0.28, 0.72, detail));
    float plasmaCoverage = clamp(0.46 + cyanField * 0.10 + violetField * 0.18 + plasmaMass * 0.12, 0.0, 0.84);
    vec3 color = mix(deepBlack, basePlasma, plasmaCoverage);
    vec3 innerColor = mix(turquoise, violet, smoothstep(0.34, 0.68, fineCloud));
    color = mix(color, innerColor, innerVeil * 0.22);
    color += mix(cyan, violet, smoothstep(0.30, 0.72, fineCloud)) * plasmaMass * 0.22;
    color += cyan * cyanField * 0.38;
    color += violet * violetField * 0.34;
    color += turquoise * strandA * 1.28;
    color += cyan * strandB * 1.16;
    color += violet * strandC * 1.10;
    color += mix(cyan, violet, smoothstep(0.35, 0.68, fineCloud)) * strandD * 0.72;
    color += vec3(0.12, 0.025, 0.22) * pow(energy, 2.4) * 0.42;
    vec3 N = normalize(vNormal);
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 L = normalize(vec3(-0.48, 0.62, 0.78));
    float diffuse = max(dot(N, L), 0.0);
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 2.2);
    vec3 H = normalize(L + V);
    float specular = pow(max(dot(N, H), 0.0), 48.0);
    float rim = smoothstep(0.20, 0.92, fresnel);
    color *= 0.48 + diffuse * 0.58;
    color += mix(cyan, violet, 0.38) * rim * 0.34;
    color += vec3(0.10, 0.025, 0.16) * specular * 0.30;
    float darkVeil = smoothstep(0.20, 0.46, 1.0 - cloud) * smoothstep(0.16, 0.48, 1.0 - detail);
    color = mix(color, deepBlack, darkVeil * 0.10);
    float deepChannels = smoothstep(0.62, 0.82, fineCloud) * (1.0 - smoothstep(0.76, 0.94, deepCloud));
    color += mix(violet, cyan, smoothstep(0.30, 0.72, detail)) * deepChannels * 0.16;
    float pulse = 0.96 + 0.04 * sin(motionTime * (0.9 + uThinking * 0.12) + cloud * 6.0);
    gl_FragColor = vec4(color * pulse * 1.52, 1.0);
  }
`;const plasmaVertexShader = `
  varying vec3 vLocal;
  varying vec3 vWorld;
  varying vec3 vNormal;
  uniform float uTime;
  uniform float uThinking;
  ${noiseFunctions}
  void main() {
    vec3 direction = normalize(position);
    float motionTime = uTime * (1.0 - uThinking * 0.84);
    float n1 = fbm3(direction * 4.0 + vec3(0.0, motionTime * 0.20, -motionTime * 0.15));
    float n2 = fbm3(direction * 7.5 - vec3(motionTime * 0.17, 0.0, motionTime * 0.12));
    float tongues = pow(max(0.0, n1 * 0.70 + n2 * 0.40 - 0.42), 1.28);
    float ripple = sin(direction.x * 7.5 + direction.y * 5.8 - motionTime * 0.62) * sin(direction.z * 6.8 + motionTime * 0.48);
    float waveDistanceA = acos(clamp(dot(direction, normalize(vec3(0.35, 0.72, 0.60))), -1.0, 1.0));
    float waveDistanceB = acos(clamp(dot(direction, normalize(vec3(-0.68, -0.24, 0.69))), -1.0, 1.0));
    float waveOut = sin(waveDistanceA * 8.2 - uTime * 0.56);
    float waveIn = sin(waveDistanceB * 7.1 + uTime * 0.43);
    float inwardOutwardWave = waveOut * 0.58 + waveIn * 0.42;
    float displacement = 0.035 + tongues * (0.15 + uThinking * 0.035) + ripple * 0.010 + inwardOutwardWave * uThinking * 0.024;
    vec3 p = direction * (0.80 + displacement);
    vLocal = direction;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * direction);
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
    float motionTime = uTime * (1.0 - uThinking * 0.84);
    float waveTime = uTime * (1.0 - uThinking * 0.72);
    float waveDistanceA = acos(clamp(dot(d, normalize(vec3(0.35, 0.72, 0.60))), -1.0, 1.0));
    float waveDistanceB = acos(clamp(dot(d, normalize(vec3(-0.68, -0.24, 0.69))), -1.0, 1.0));
    float waveOut = sin(waveDistanceA * 8.2 - waveTime * 0.56);
    float waveIn = sin(waveDistanceB * 7.1 + waveTime * 0.43);
    float livingWave = waveOut * 0.58 + waveIn * 0.42;
    float t = motionTime * 0.14;
    vec3 flow = d * 6.0 + vec3(t, -t * 0.76, t * 0.56);
    vec3 warp = vec3(fbm3(flow + 2.0), fbm3(flow + 8.0), fbm3(flow + 14.0));
    vec3 q = flow + (warp - 0.5) * 4.0 + d * livingWave * uThinking * 0.16;
    float cloud = fbm3(q * 1.15);
    float detail = fbm3(q * 2.0);
    float lineA = dot(q, vec3(1.2, 2.0, -1.4)) * 4.1 + cloud * 8.0 - t * 2.2;
    float lineB = dot(q, vec3(-1.6, 0.8, 1.7)) * 3.5 - detail * 7.0 + t * 1.7;
    float ridgesA = pow(max(0.0, 1.0 - abs(sin(lineA))), 15.0) * smoothstep(0.40, 0.72, cloud);
    float ridgesB = pow(max(0.0, 1.0 - abs(sin(lineB))), 19.0) * smoothstep(0.43, 0.74, detail);
    float filament = clamp(ridgesA * 0.82 + ridgesB * 0.72, 0.0, 1.0);
    float sparks = pow(max(0.0, 1.0 - abs(fbm3(q * 3.2 + 4.0) * 2.0 - 1.0)), 19.0);
    sparks *= smoothstep(0.48, 0.76, cloud) * smoothstep(0.32, 0.66, detail);
    vec3 cyan = vec3(0.025, 0.86, 0.82);
    vec3 violet = vec3(0.68, 0.22, 0.98);
    float colorMix = smoothstep(0.30, 0.64, fbm3(q * 0.68 + 4.0));
    vec3 color = mix(cyan, violet, colorMix);
    color += vec3(0.12, 0.025, 0.20) * sparks * 0.30;
    float facing = max(dot(normalize(vNormal), normalize(cameraPosition - vWorld)), 0.0);
    float rim = pow(1.0 - facing, 1.55);
    float alpha = clamp(filament * 0.76 + sparks * 0.22 + rim * filament * 0.12, 0.0, 0.78);
    float brightness = 0.68 + filament * 1.28 + sparks * 0.48 + abs(livingWave) * uThinking * 0.08;
    gl_FragColor = vec4(color * brightness, alpha);
  }
`;function LivingOrb({ isThinking }: OrbVisualProps) {
  const core = useRef<THREE.Mesh>(null);
  const plasmaShell = useRef<THREE.Mesh>(null);

  const coreMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uThinking: { value: 0 } },
    vertexShader: coreVertexShader, fragmentShader: coreFragmentShader,
    transparent: false, depthWrite: true, toneMapped: false,
  }), []);

  const plasmaMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uThinking: { value: 0 } },
    vertexShader: plasmaVertexShader, fragmentShader: plasmaFragmentShader,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.FrontSide, toneMapped: false,
  }), []);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const thinking = isThinking ? 1 : 0;
    const speed = isThinking ? 0.025 : 1.0;
    [coreMaterial, plasmaMaterial].forEach((material) => {
      material.uniforms.uTime.value = t;
      material.uniforms.uThinking.value = THREE.MathUtils.damp(material.uniforms.uThinking.value, thinking, 3.0, delta);
    });
    if (core.current) {
      const breath = 1 + Math.sin(t * (isThinking ? 0.72 : 1.05)) * (isThinking ? 0.038 : 0.026);
      core.current.scale.setScalar(breath);
      core.current.rotation.y = t * 0.11 * speed;
      core.current.rotation.x = Math.sin(t * (isThinking ? 0.035 : 0.27)) * (isThinking ? 0.018 : 0.045);
    }
    if (plasmaShell.current) {
      plasmaShell.current.rotation.y = -t * 0.075 * speed;
      plasmaShell.current.rotation.x = Math.sin(t * (isThinking ? 0.028 : 0.21)) * (isThinking ? 0.022 : 0.06);
      plasmaShell.current.scale.setScalar(1 + Math.sin(t * (isThinking ? 0.68 : 0.9)) * 0.018);
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
    </>
  );
}

export default function OrbVisual({ isThinking }: OrbVisualProps) {
  return (
    <div className={`mf-orb-scene${isThinking ? ' is-thinking' : ''}`} aria-hidden="true">
      <div className="mf-orb-platform">
        <span />
        <span />
        <span />
      </div>

      <div className="mf-orb-orbit mf-orb-orbit-back" />
      <div className="mf-orb-orbit mf-orb-orbit-back mf-orb-orbit-violet" />

      <div className="mf-orb-sphere">
        <Canvas dpr={[1, 1.35]} camera={{ position: [0, 0, 3.65], fov: 42 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
          fallback={<div className="mf-orb-fallback" />}>
          <LivingOrb isThinking={isThinking} />
        </Canvas>
      </div>

      <div className="mf-orb-orbit mf-orb-orbit-front" />
      <div className="mf-orb-orbit mf-orb-orbit-front mf-orb-orbit-violet mf-orb-orbit-second" />
      <div className="mf-orb-sparkles" />

      <style>{`
        .mf-orb-scene {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: visible;
          isolation: isolate;
          perspective: 700px;
          animation: mfOrbSceneFloat 6s ease-in-out infinite;
        }
        .mf-orb-sphere {
          position: absolute;
          z-index: 2;
          left: 9%;
          top: 0;
          width: 82%;
          height: 83%;
          filter: drop-shadow(0 0 10px rgba(28, 207, 245, .32))
                  drop-shadow(0 0 18px rgba(157, 57, 255, .2));
        }
        .mf-orb-sphere canvas {
          display: block;
          width: 100% !important;
          height: 100% !important;
        }
        .mf-orb-orbit {
          position: absolute;
          z-index: 3;
          left: 1%;
          top: 24%;
          width: 98%;
          height: 42%;
          border: 2px solid rgba(31, 218, 255, .86);
          border-radius: 50%;
          transform-style: preserve-3d;
          transform: rotate(-22deg) rotateX(67deg);
          box-shadow: 0 0 5px #20dfff, 0 0 13px rgba(24, 199, 255, .78),
                      inset 0 0 8px rgba(28, 219, 255, .5);
          animation: mfOrbOrbitSpin 13s linear infinite;
          pointer-events: none;
        }
        .mf-orb-orbit::after {
          content: '';
          position: absolute;
          width: 7px;
          height: 7px;
          top: 8%;
          left: 19%;
          border-radius: 50%;
          background: #b9ffff;
          box-shadow: 0 0 7px 3px #24dfff, 0 0 17px 6px rgba(24, 199, 255, .7);
        }
        .mf-orb-orbit-violet {
          left: 7%;
          top: 18%;
          width: 86%;
          height: 51%;
          border-color: rgba(205, 63, 255, .9);
          box-shadow: 0 0 6px #bd42ff, 0 0 14px rgba(179, 53, 255, .75),
                      inset 0 0 8px rgba(189, 65, 255, .42);
          animation-duration: 17s;
          animation-direction: reverse;
        }
        .mf-orb-orbit-violet::after {
          left: auto;
          right: 14%;
          top: 13%;
          background: #ffe0ff;
          box-shadow: 0 0 7px 3px #d34aff, 0 0 17px 6px rgba(202, 62, 255, .75);
        }
        .mf-orb-orbit-back {
          z-index: 1;
          top: 20%;
          opacity: .78;
        }
        .mf-orb-orbit-front {
          top: 31%;
          transform: rotate(16deg) rotateX(69deg);
          animation-duration: 19s;
        }
        .mf-orb-orbit-second {
          top: 27%;
          transform: rotate(-34deg) rotateX(70deg);
          animation-duration: 23s;
        }
        .mf-orb-sparkles {
          position: absolute;
          z-index: 4;
          inset: 2% 0 12%;
          pointer-events: none;
          background:
            radial-gradient(circle at 10% 37%, #8afaff 0 1.5px, transparent 3px),
            radial-gradient(circle at 21% 14%, #dca2ff 0 1.4px, transparent 3px),
            radial-gradient(circle at 83% 18%, #9cfaff 0 1.5px, transparent 3px),
            radial-gradient(circle at 92% 53%, #d98aff 0 1.5px, transparent 3px),
            radial-gradient(circle at 16% 77%, #39dfff 0 1.7px, transparent 3px),
            radial-gradient(circle at 76% 83%, #5deaff 0 1.5px, transparent 3px),
            radial-gradient(circle at 51% 5%, #b4faff 0 1.3px, transparent 3px);
          filter: drop-shadow(0 0 5px #39dfff);
          animation: mfOrbSparkle 3.8s ease-in-out infinite alternate;
        }
        .mf-orb-platform {
          position: absolute;
          z-index: 1;
          left: 4%;
          bottom: 3%;
          width: 92%;
          height: 22%;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(20, 221, 255, .2), rgba(105, 44, 255, .12) 42%, transparent 72%);
          filter: blur(2px);
          transform: rotateX(62deg);
        }
        .mf-orb-platform span {
          position: absolute;
          inset: 12% 2%;
          border: 1.5px solid rgba(34, 218, 255, .85);
          border-radius: 50%;
          box-shadow: 0 0 7px rgba(23, 216, 255, .85), inset 0 0 8px rgba(23, 216, 255, .3);
        }
        .mf-orb-platform span:nth-child(2) {
          inset: 23% 13%;
          border-color: rgba(190, 74, 255, .9);
          box-shadow: 0 0 8px rgba(191, 66, 255, .8), inset 0 0 7px rgba(191, 66, 255, .3);
        }
        .mf-orb-platform span:nth-child(3) {
          inset: 34% 27%;
          border-color: rgba(67, 238, 255, .9);
          box-shadow: 0 0 9px rgba(44, 225, 255, .9);
        }
        @keyframes mfOrbSceneFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes mfOrbOrbitSpin {
          from { rotate: 0deg; }
          to { rotate: 360deg; }
        }
        @keyframes mfOrbSparkle {
          from { opacity: .55; }
          to { opacity: 1; }
        }
        .mf-orb-scene.is-thinking .mf-orb-orbit {
          animation-duration: 7s;
          filter: brightness(1.35);
        }
        .mf-orb-scene.is-thinking .mf-orb-sparkles {
          animation-duration: 1.5s;
        }
        @media (prefers-reduced-motion: reduce) {
          .mf-orb-scene, .mf-orb-orbit, .mf-orb-sparkles {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
