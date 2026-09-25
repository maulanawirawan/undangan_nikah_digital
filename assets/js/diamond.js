/*
 * Material berlian realistis: refraksi ray-traced di dalam batu.
 *
 * Cahaya masuk ke batu, dibiaskan (IOR berlian 2.42), memantul total di
 * dalam faset (total internal reflection) beberapa kali, lalu keluar dan
 * mengambil warna dari lingkungan studio (HDRI). Dispersi memisahkan
 * kanal merah/hijau/biru → "fire" pelangi khas berlian.
 *
 * Shader diadaptasi dari MeshRefractionMaterial karya N8Programs di
 * @react-three/drei (MIT), dengan pelacakan sinar memakai three-mesh-bvh
 * (MIT, Garrett Johnson). HDRI "studio" dari Poly Haven via @pmndrs/assets (CC0).
 */
import * as THREE from 'three';
import { MeshBVH, MeshBVHUniformStruct, SAH, shaderStructs, shaderIntersectFunction } from '../vendor/three-mesh-bvh.module.js';
import { EXRLoader } from '../vendor/loaders/EXRLoader.js';

let hdrPromise = null;
export function loadStudioHDR() {
  if (!hdrPromise) {
    hdrPromise = new Promise((resolve, reject) => {
      new EXRLoader().load(new URL('../media/studio.exr', import.meta.url).href, (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        // HDRI hanya dipakai lewat PMREM (logam), tidak perlu mipmap half-float
        // (generateMipmap pada RGBA16F tidak didukung sebagian GPU HP)
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        resolve(tex);
      }, undefined, reject);
    });
  }
  return hdrPromise;
}

// "Light box" perhiasan untuk berlian: seperti studio foto cincin — sekeliling
// terang dengan softbox putih, beberapa strip gelap untuk kontras kilau,
// dan sedikit pantulan merlot hangat. Digambar di canvas (equirect 8-bit
// sRGB + mipmap) supaya aman di semua HP.
let gemEnv = null;
export function gemEnvironment() {
  if (gemEnv) return gemEnv;
  const W = 1024, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#f4f1ee');
  base.addColorStop(0.42, '#d9d3cf');
  base.addColorStop(0.5, '#b9aeab');
  base.addColorStop(0.62, '#8c7f80');
  base.addColorStop(1, '#3a3035');
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);
  // pantulan hangat merlot/pink dari sekitar
  [[0.15, 0.55, '#c98f9e'], [0.62, 0.58, '#b98690'], [0.88, 0.5, '#e0b9a8']].forEach(([u, v, col]) => {
    const r = g.createRadialGradient(u * W, v * H, 0, u * W, v * H, 170);
    r.addColorStop(0, col); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.55; g.fillStyle = r; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
  });
  // strip gelap vertikal (stand lampu / reflektor hitam) → kontras & scintillation
  g.fillStyle = '#141013';
  for (let i = 0; i < 9; i++) {
    const x = ((i + 0.3) / 9) * W, w = 10 + (i % 3) * 8;
    g.fillRect(x, H * 0.08, w, H * (0.5 + (i % 4) * 0.1));
  }
  // softbox putih terang
  g.shadowColor = '#ffffff';
  g.shadowBlur = 30;
  g.fillStyle = '#ffffff';
  [[0.04, 0.2, 0.1, 0.3], [0.2, 0.12, 0.07, 0.2], [0.33, 0.28, 0.12, 0.2], [0.5, 0.1, 0.09, 0.32],
    [0.68, 0.22, 0.11, 0.24], [0.83, 0.1, 0.07, 0.3], [0.93, 0.3, 0.05, 0.16]].forEach(([u, v, w, h]) => {
    g.fillRect(u * W, v * H, w * W, h * H);
  });
  g.fillRect(0, 0, W, H * 0.06); // lampu atas (zenith)
  g.shadowBlur = 0;
  // bayangan kecil di bawah (kepala pengamat) → pola bow-tie yang wajar
  const nad = g.createLinearGradient(0, H * 0.86, 0, H);
  nad.addColorStop(0, 'rgba(20,14,18,0)');
  nad.addColorStop(1, 'rgba(20,14,18,.9)');
  g.fillStyle = nad;
  g.fillRect(0, H * 0.86, W, H * 0.14);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  gemEnv = tex;
  return tex;
}

const vertexShader = /* glsl */`
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying mat4 vModelMatrixInverse;
  uniform mat4 viewMatrixInverse;
  void main() {
    vModelMatrixInverse = inverse(modelMatrix);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vNormal = normalize((viewMatrixInverse * vec4(normalMatrix * normal, 0.0)).xyz);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */`
  precision highp isampler2D;
  precision highp usampler2D;
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying mat4 vModelMatrixInverse;
  uniform sampler2D envMap;
  uniform float bounces;
  ${shaderStructs}
  ${shaderIntersectFunction}
  uniform BVH bvh;
  uniform float ior;
  uniform vec2 resolution;
  uniform float fresnel;
  uniform float envIntensity;
  uniform mat4 modelMatrix;
  uniform mat4 projectionMatrixInverse;
  uniform mat4 viewMatrixInverse;
  uniform float aberrationStrength;
  uniform vec3 color;

  vec3 totalInternalReflection(vec3 ro, vec3 rd, vec3 normal, float ior, mat4 modelMatrixInverse) {
    vec3 rayOrigin = ro;
    vec3 rayDirection = refract(rd, normal, 1.0 / ior);
    rayOrigin = vWorldPosition + rayDirection * 0.001;
    rayOrigin = (modelMatrixInverse * vec4(rayOrigin, 1.0)).xyz;
    rayDirection = normalize((modelMatrixInverse * vec4(rayDirection, 0.0)).xyz);
    for (float i = 0.0; i < bounces; i++) {
      uvec4 faceIndices = uvec4(0u);
      vec3 faceNormal = vec3(0.0, 0.0, 1.0);
      vec3 barycoord = vec3(0.0);
      float side = 1.0;
      float dist = 0.0;
      bvhIntersectFirstHit(bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist);
      vec3 hitPos = rayOrigin + rayDirection * max(dist - 0.001, 0.0);
      vec3 tempDir = refract(rayDirection, faceNormal, ior);
      if (length(tempDir) != 0.0) { rayDirection = tempDir; break; }
      rayDirection = reflect(rayDirection, faceNormal);
      rayOrigin = hitPos + rayDirection * 0.01;
    }
    return normalize((modelMatrix * vec4(rayDirection, 0.0)).xyz);
  }

  #include <common>

  vec4 textureGradient(sampler2D envMap, vec3 rayDirection, vec3 directionCamPerfect) {
    vec2 uvv = equirectUv(rayDirection);
    vec2 smoothUv = equirectUv(directionCamPerfect);
    return textureGrad(envMap, uvv, dFdx(smoothUv), dFdy(smoothUv));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec3 directionCamPerfect = (projectionMatrixInverse * vec4(uv * 2.0 - 1.0, 0.0, 1.0)).xyz;
    directionCamPerfect = normalize((viewMatrixInverse * vec4(directionCamPerfect, 0.0)).xyz);
    vec3 normal = normalize(vNormal);
    vec3 rayDirection = normalize(vWorldPosition - cameraPosition);

    // dispersi: IOR sedikit berbeda untuk tiap kanal warna
    vec3 dR = totalInternalReflection(cameraPosition, rayDirection, normal, max(ior * (1.0 - aberrationStrength), 1.0), vModelMatrixInverse);
    vec3 dG = totalInternalReflection(cameraPosition, rayDirection, normal, max(ior, 1.0), vModelMatrixInverse);
    vec3 dB = totalInternalReflection(cameraPosition, rayDirection, normal, max(ior * (1.0 + aberrationStrength), 1.0), vModelMatrixInverse);
    vec3 col = vec3(
      textureGradient(envMap, dR, directionCamPerfect).r,
      textureGradient(envMap, dG, directionCamPerfect).g,
      textureGradient(envMap, dB, directionCamPerfect).b
    ) * color * envIntensity;

    // pantulan permukaan (Fresnel) dari faset luar
    vec3 refl = reflect(rayDirection, normal);
    float f = fresnel + (1.0 - fresnel) * pow(1.0 - clamp(dot(-rayDirection, normal), 0.0, 1.0), 5.0);
    vec3 surf = textureGradient(envMap, refl, directionCamPerfect).rgb * envIntensity;
    gl_FragColor = vec4(mix(col, surf, f), 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Membuat material berlian untuk geometri tertentu (BVH dibangun dari geometri batu).
export function createDiamondMaterial(geometry, envMap, opts = {}) {
  const bvh = new MeshBVHUniformStruct();
  const geo = geometry.index ? geometry.clone().toNonIndexed() : geometry.clone();
  bvh.updateFrom(new MeshBVH(geo, { strategy: SAH }));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      envMap: { value: envMap },
      bounces: { value: opts.bounces ?? 6 },
      ior: { value: opts.ior ?? 2.42 },
      aberrationStrength: { value: opts.aberration ?? 0.018 },
      fresnel: { value: opts.fresnel ?? 0.06 },
      envIntensity: { value: opts.envIntensity ?? 1.4 },
      color: { value: new THREE.Color(opts.color ?? 0xffffff) },
      bvh: { value: bvh },
      resolution: { value: new THREE.Vector2(1, 1) },
      viewMatrixInverse: { value: new THREE.Matrix4() },
      projectionMatrixInverse: { value: new THREE.Matrix4() },
    },
    vertexShader,
    fragmentShader,
  });
  const size = new THREE.Vector2();
  // dipasang ke mesh: perbarui matriks kamera & resolusi setiap render
  mat.bindTo = (mesh) => {
    mesh.onBeforeRender = (renderer, scene, camera) => {
      renderer.getDrawingBufferSize(size);
      mat.uniforms.resolution.value.copy(size);
      mat.uniforms.viewMatrixInverse.value.copy(camera.matrixWorld);
      mat.uniforms.projectionMatrixInverse.value.copy(camera.projectionMatrixInverse);
    };
  };
  return mat;
}
