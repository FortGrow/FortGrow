"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";

/**
 * Objeto 3D da Home — esfera de "metal líquido" com shader próprio:
 * ruído simplex desloca os vértices (organismo digital), fresnel dá o brilho
 * de energia e o gradiente azul→ciano segue a paleta do site. O mouse inclina
 * e atrai o objeto; o scroll faz o morphing (amplitude, cor, posição e escala
 * mudam conforme a página desce) — ele nunca some, só se transforma.
 */

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uFreq;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying float vNoise;

  // Simplex noise 3D (Ashima Arts / Ian McEwan, domínio público)
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main(){
    float n = snoise(normal * uFreq + vec3(uTime * 0.25));
    float n2 = snoise(normal * uFreq * 2.4 + vec3(uTime * 0.4));
    vNoise = n * 0.75 + n2 * 0.25;
    vec3 displaced = position + normal * vNoise * uAmp;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
    vPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uScroll;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying float vNoise;

  void main(){
    vec3 viewDir = normalize(-vPos);
    float fresnel = pow(1.0 - max(dot(viewDir, normalize(vNormal)), 0.0), 2.2);
    // Gradiente vivo: azul → ciano no relevo do ruído; violeta entra com o scroll
    vec3 base = mix(uColorA, uColorB, smoothstep(-0.6, 0.8, vNoise));
    base = mix(base, uColorC, uScroll * 0.55);
    vec3 color = base * (0.26 + fresnel * 1.25) + uColorB * fresnel * 0.45;
    // Nunca some, mas se aquieta: escurece levemente conforme a página desce
    float alpha = (0.3 + fresnel * 0.5) * (1.0 - uScroll * 0.35);
    gl_FragColor = vec4(color, alpha);
  }
`;

function LiquidOrb({
  scrollRef,
  ctaRef,
  mouseRef,
}: {
  scrollRef: React.MutableRefObject<number>;
  ctaRef: React.MutableRefObject<number>;
  mouseRef: React.MutableRefObject<[number, number]>;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.16 },
      uFreq: { value: 1.35 },
      uScroll: { value: 0 },
      uColorA: { value: new THREE.Color("#3B82F6") },
      uColorB: { value: new THREE.Color("#22D3EE") },
      uColorC: { value: new THREE.Color("#8B5CF6") },
    }),
    []
  );

  useFrame((state, delta) => {
    const m = mesh.current;
    if (!m) return;
    const scroll = scrollRef.current;
    const [mx, my] = mouseRef.current;

    uniforms.uTime.value += delta;
    // Morphing pelo scroll: mais "vivo" e violeta conforme a página desce
    uniforms.uAmp.value = THREE.MathUtils.lerp(uniforms.uAmp.value, 0.16 + scroll * 0.42, 0.06);
    uniforms.uFreq.value = THREE.MathUtils.lerp(uniforms.uFreq.value, 1.35 + scroll * 1.6, 0.06);
    uniforms.uScroll.value = THREE.MathUtils.lerp(uniforms.uScroll.value, scroll, 0.08);

    // Posição: direita no hero → esquerda pela página toda → centro só quando o
    // CTA final entra na tela (ctaRef mede a posição real da seção #contato)
    const cta = ctaRef.current;
    // Na metade final (seções com conteúdo centralizado) ele encosta na borda
    const edge = THREE.MathUtils.smoothstep(scroll, 0.4, 0.6);
    const sideBase = THREE.MathUtils.lerp(-1.9, -3.0, edge);
    const sideX = scroll < 0.15 ? THREE.MathUtils.mapLinear(scroll, 0, 0.15, 1.45, -1.9) : sideBase + Math.sin(scroll * Math.PI * 4) * 0.2;
    const targetX = THREE.MathUtils.lerp(sideX, 0, cta);
    const targetY = Math.sin(scroll * Math.PI * 2) * 0.35 * (1 - cta);
    const targetScale = 1 - scroll * 0.4;
    m.position.x = THREE.MathUtils.lerp(m.position.x, targetX + mx * 0.25, 0.05);
    m.position.y = THREE.MathUtils.lerp(m.position.y, targetY - my * 0.25, 0.05);
    m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, targetScale, 0.05));

    m.rotation.y += delta * 0.12;
    m.rotation.x = THREE.MathUtils.lerp(m.rotation.x, my * 0.5 + scroll * 1.4, 0.04);
    m.rotation.z = THREE.MathUtils.lerp(m.rotation.z, mx * 0.3, 0.04);
  });

  return (
    <mesh ref={mesh} position={[1.45, 0, 0]}>
      <icosahedronGeometry args={[1.05, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/** Canvas fixo ao fundo da Home — o conteúdo rola por cima dele. */
export default function HeroOrb() {
  const scrollRef = useRef(0);
  const ctaRef = useRef(0);
  const mouseRef = useRef<[number, number]>([0, 0]);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollRef.current = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      // Progresso do CTA final entrando na tela (0 = fora, 1 = bem visível)
      const cta = document.getElementById("contato");
      if (cta) {
        const r = cta.getBoundingClientRect();
        ctaRef.current = Math.min(1, Math.max(0, 1 - r.top / (window.innerHeight * 0.7)));
      }
    };
    const onMove = (e: PointerEvent) => {
      mouseRef.current = [(e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1];
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 5.1], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <LiquidOrb scrollRef={scrollRef} ctaRef={ctaRef} mouseRef={mouseRef} />
      </Canvas>
    </div>
  );
}
