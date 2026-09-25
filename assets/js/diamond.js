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
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        resolve(tex);
      }, undefined, reject);
    });
  }
  return hdrPromise;
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
      bounces: { value: opts.bounces ?? 4 },
      ior: { value: opts.ior ?? 2.42 },
      aberrationStrength: { value: opts.aberration ?? 0.018 },
      fresnel: { value: opts.fresnel ?? 0.08 },
      envIntensity: { value: opts.envIntensity ?? 1.12 },
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
