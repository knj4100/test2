import { useEffect, useState, useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { TargetSurfaceConfig } from './TargetSurfacePanel';

interface TerrainGridProps {
  visible: boolean;
  gridSize?: number;
  gridSpacing?: number;
  lineWidth?: number;
  heightColorScale?: boolean;
  targetSurfaceConfig?: TargetSurfaceConfig;
  center?: { x: number, z: number };
  circularMask?: boolean;
  showFill?: boolean;
  opacity?: number;
  cuttingEdgeRef?: React.RefObject<THREE.Group>;
  showSectionOnly?: boolean;
  sectionDirection?: 'longitudinal' | 'transverse';
  vehicleRotation?: number;
  gridCenterMode?: 'manual' | 'vehicle' | 'bucket';
  continuousUpdate?: boolean;
  vehiclePosition?: { x: number, z: number };
  viewActive?: boolean;
}

const MAX_GRID_SIZE = 40;

// Pre-compute target surface normal (avoid creating objects per-call)
const _p0 = new THREE.Vector3();
const _euler = new THREE.Euler();
const _normal = new THREE.Vector3();

const getTargetSurfaceHeight = (x: number, z: number, config: TargetSurfaceConfig) => {
  if (!config.visible) return -Infinity;
  _p0.set(config.position.x, config.position.y, config.position.z);
  _euler.set(THREE.MathUtils.degToRad(config.gradient.x), 0, THREE.MathUtils.degToRad(config.gradient.z), 'XYZ');
  _normal.set(0, 1, 0).applyEuler(_euler);
  if (Math.abs(_normal.y) < 0.0001) return -Infinity;
  return _p0.y - (_normal.x * (x - _p0.x) + _normal.z * (z - _p0.z)) / _normal.y;
};

// Reusable Color instance for color computation (avoids GC pressure)
const _tmpColor = new THREE.Color();

const computeColor = (
  x: number, z: number, height: number,
  targetSurfaceConfig: TargetSurfaceConfig | undefined,
  heightColorScale: boolean,
  minHeight: number, heightRange: number,
  showFill: boolean
): { r: number; g: number; b: number } => {
  if (showFill) return { r: 1, g: 1, b: 1 };

  if (targetSurfaceConfig?.visible) {
    const targetY = getTargetSurfaceHeight(x, z, targetSurfaceConfig);
    if (targetY === -Infinity) return { r: 0.533, g: 0.533, b: 0.533 };
    const diff = height - targetY;
    const tolerance = 0.0002;
    if (Math.abs(diff) <= tolerance) return { r: 0, g: 1, b: 0 };
    if (diff > 0) return { r: 1, g: 0, b: 0 };
    return { r: 0, g: 0, b: 1 };
  }

  if (!heightColorScale || heightRange === 0) return { r: 0, g: 1, b: 0 };

  const normalized = (height - minHeight) / heightRange;
  if (normalized < 0.25) {
    const t = normalized / 0.25;
    return { r: 0, g: t, b: 1 };
  } else if (normalized < 0.5) {
    const t = (normalized - 0.25) / 0.25;
    return { r: 0, g: 1, b: 1 - t };
  } else if (normalized < 0.75) {
    const t = (normalized - 0.5) / 0.25;
    return { r: t, g: 1, b: 0 };
  } else {
    const t = (normalized - 0.75) / 0.25;
    return { r: 1, g: 1 - t, b: 0 };
  }
};

// GPU heightmap resources (module-scope, shared across instances)
const _heightMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    varying float vWorldY;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldY = worldPos.y;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    varying float vWorldY;
    void main() {
      gl_FragColor = vec4(vWorldY, 0.0, 0.0, 1.0);
    }
  `,
  side: THREE.DoubleSide
});
const _depthCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20001);

export function TerrainGrid({
  visible,
  gridSize = 20,
  gridSpacing = 0.001,
  lineWidth = 1,
  heightColorScale = true,
  targetSurfaceConfig,
  center = { x: 0, z: 0 },
  circularMask = false,
  showFill = false,
  opacity = 1,
  cuttingEdgeRef,
  showSectionOnly = false,
  sectionDirection = 'longitudinal',
  vehicleRotation = 0,
  gridCenterMode = 'manual',
  continuousUpdate = false,
  vehiclePosition,
  viewActive = true
}: TerrainGridProps) {
  const { scene, gl } = useThree();
  const effectiveGridSize = Math.min(gridSize, MAX_GRID_SIZE);
  const [geometries, setGeometries] = useState<{
    fill: THREE.BufferGeometry | null;
    lines: THREE.BufferGeometry | null;
  }>({ fill: null, lines: null });

  const [lineData, setLineData] = useState<{
    points: THREE.Vector3[],
    colors: [number, number, number][]
  } | null>(null);

  const [sectionData, setSectionData] = useState<{
    points: THREE.Vector3[],
    colors: [number, number, number][]
  } | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const generationIdRef = useRef(0);

  const gridDataRef = useRef<{
    points: Array<{ x: number; z: number; height: number | null }>;
    minHeight: number;
    maxHeight: number;
    gridSize: number;
    gridSpacing: number;
    center: { x: number, z: number };
    lineIndicesMap: Map<number, number[]>;
    fillIndicesMap: Map<number, number>;
    linePositions: Float32Array;
    lineColors: Float32Array;
    sectionPointsVec: THREE.Vector3[];
    sectionColorsVec: [number, number, number][];
  } | null>(null);

  const linesMeshRef = useRef<any>(null);
  const sectionLineRef = useRef<any>(null);
  const fillMeshRef = useRef<THREE.Mesh>(null);

  // Pre-allocated arrays for section update (avoid allocation every frame)
  const sectionPositionsBuf = useRef<number[]>([]);
  const sectionColorsBuf = useRef<number[]>([]);
  const prevSectionKey = useRef('');
  const prevExcavationKey = useRef('');
  const needsExcavation = useRef(false);
  const frameCounterRef = useRef(0);

  // Auto-follow state
  const [autoCenter, setAutoCenter] = useState<{ x: number, z: number }>({ x: 0, z: 0 });
  const lastGenCenterRef = useRef<{ x: number, z: number }>({ x: 0, z: 0 });

  // effectiveCenter: manual mode uses prop center, auto modes use autoCenter
  const effectiveCenter = gridCenterMode === 'manual' ? center : autoCenter;

  // Reusable worldPos for useFrame
  const _worldPos = useRef(new THREE.Vector3());

  // GPU heightmap render target
  const renderTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const rtSizeRef = useRef(0);

  const generateGridAsync = useCallback(() => {
    const genId = ++generationIdRef.current;
    setIsGenerating(true);

    // Record center used for this generation
    lastGenCenterRef.current = { x: effectiveCenter.x, z: effectiveCenter.z };

    // Collect target meshes
    const environmentMeshes: THREE.Mesh[] = [];
    const allMeshes: THREE.Mesh[] = [];

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.userData.isTargetSurface) return;
        if (mesh.geometry && mesh.geometry.attributes.position) {
          allMeshes.push(mesh);
          if (mesh.userData.isEnvironmentMesh) {
            environmentMeshes.push(mesh);
          }
        }
      }
    });

    const targetMeshes = environmentMeshes.length > 0 ? environmentMeshes : allMeshes;

    if (targetMeshes.length === 0) {
      setIsGenerating(false);
      return;
    }

    // --- GPU Heightmap Generation ---
    const totalRows = effectiveGridSize + 1;
    const halfSize = (effectiveGridSize * gridSpacing) / 2;
    const radiusSq = halfSize * halfSize;

    // Ensure render target exists with correct size
    const rtSize = Math.pow(2, Math.ceil(Math.log2(effectiveGridSize * 2)));
    if (rtSizeRef.current !== rtSize) {
      renderTargetRef.current?.dispose();
      renderTargetRef.current = new THREE.WebGLRenderTarget(rtSize, rtSize, {
        type: THREE.FloatType,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
      });
      rtSizeRef.current = rtSize;
    }

    // Setup orthographic camera looking straight down
    _depthCamera.left = -halfSize;
    _depthCamera.right = halfSize;
    _depthCamera.top = halfSize;
    _depthCamera.bottom = -halfSize;
    _depthCamera.position.set(effectiveCenter.x, 10000, effectiveCenter.z);
    _depthCamera.up.set(0, 0, -1);
    _depthCamera.lookAt(effectiveCenter.x, 0, effectiveCenter.z);
    _depthCamera.updateProjectionMatrix();
    _depthCamera.updateMatrixWorld(true);

    // Hide non-target meshes temporarily
    const targetSet = new Set(targetMeshes);
    const hiddenObjects: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (!targetSet.has(mesh) && mesh.visible) {
          mesh.visible = false;
          hiddenObjects.push(mesh);
        }
      }
    });

    // Render scene with height material to render target
    const prevOverrideMaterial = scene.overrideMaterial;
    scene.overrideMaterial = _heightMaterial;
    const prevRenderTarget = gl.getRenderTarget();
    const _clearColor = new THREE.Color();
    gl.getClearColor(_clearColor);
    const prevClearAlpha = gl.getClearAlpha();

    gl.setClearColor(0x000000, 0);
    gl.setRenderTarget(renderTargetRef.current);
    gl.clear();
    gl.render(scene, _depthCamera);
    gl.setRenderTarget(prevRenderTarget);
    gl.setClearColor(_clearColor, prevClearAlpha);
    scene.overrideMaterial = prevOverrideMaterial;

    // Restore hidden meshes
    for (const obj of hiddenObjects) obj.visible = true;

    // Read pixel data from render target
    const pixelData = new Float32Array(rtSize * rtSize * 4);
    gl.readRenderTargetPixels(renderTargetRef.current!, 0, 0, rtSize, rtSize, pixelData);

    // Map pixels to grid points
    const gridPoints: Array<{ x: number; z: number; height: number | null }> = [];
    const heights: number[] = [];

    for (let j = 0; j < totalRows; j++) {
      for (let i = 0; i < totalRows; i++) {
        const x = effectiveCenter.x - halfSize + i * gridSpacing;
        const z = effectiveCenter.z - halfSize + j * gridSpacing;

        const px = Math.round(i * (rtSize - 1) / effectiveGridSize);
        const py = Math.round((effectiveGridSize - j) * (rtSize - 1) / effectiveGridSize);
        const pixelIdx = (py * rtSize + px) * 4;

        const alpha = pixelData[pixelIdx + 3];
        let height: number | null = null;
        if (alpha > 0) {
          height = pixelData[pixelIdx] + 0.0001;
          heights.push(height);
        }
        gridPoints.push({ x, z, height });
      }
    }

    // --- Build geometry ---
    if (genId !== generationIdRef.current) return;

    if (heights.length === 0) {
      setIsGenerating(false);
      return;
    }

    // Use loop instead of spread to avoid stack overflow on large arrays
    let minHeight = heights[0];
    let maxHeight = heights[0];
    for (let k = 1; k < heights.length; k++) {
      if (heights[k] < minHeight) minHeight = heights[k];
      if (heights[k] > maxHeight) maxHeight = heights[k];
    }
    const heightRange = maxHeight - minHeight;

    const isInsideMask = (x: number, z: number) => {
      if (!circularMask) return true;
      const dx = x - effectiveCenter.x;
      const dz = z - effectiveCenter.z;
      return dx * dx + dz * dz <= radiusSq;
    };

    // Build line geometry
    const lineIndicesMap = new Map<number, number[]>();
    const linePositionsFlat: number[] = [];
    const lineColorsFlat: number[] = [];
    const linePointsVec: THREE.Vector3[] = [];
    const lineColorsVec: [number, number, number][] = [];

    const addLineSegment = (
      p1: { x: number, height: number, z: number },
      p2: { x: number, height: number, z: number },
      idx1: number, idx2: number
    ) => {
      linePointsVec.push(new THREE.Vector3(p1.x, p1.height, p1.z));
      linePointsVec.push(new THREE.Vector3(p2.x, p2.height, p2.z));

      linePositionsFlat.push(p1.x, p1.height, p1.z);
      linePositionsFlat.push(p2.x, p2.height, p2.z);

      const c1 = computeColor(p1.x, p1.z, p1.height, targetSurfaceConfig, heightColorScale, minHeight, heightRange, showFill);
      const c2 = computeColor(p2.x, p2.z, p2.height, targetSurfaceConfig, heightColorScale, minHeight, heightRange, showFill);

      lineColorsVec.push([c1.r, c1.g, c1.b]);
      lineColorsVec.push([c2.r, c2.g, c2.b]);

      lineColorsFlat.push(c1.r, c1.g, c1.b);
      lineColorsFlat.push(c2.r, c2.g, c2.b);

      const p1LineIdx = linePositionsFlat.length - 6 + 1;
      if (!lineIndicesMap.has(idx1)) lineIndicesMap.set(idx1, []);
      lineIndicesMap.get(idx1)!.push(p1LineIdx);

      const p2LineIdx = linePositionsFlat.length - 3 + 1;
      if (!lineIndicesMap.has(idx2)) lineIndicesMap.set(idx2, []);
      lineIndicesMap.get(idx2)!.push(p2LineIdx);
    };

    // X direction
    for (let j = 0; j <= effectiveGridSize; j++) {
      for (let i = 0; i < effectiveGridSize; i++) {
        const idx1 = j * (effectiveGridSize + 1) + i;
        const idx2 = j * (effectiveGridSize + 1) + (i + 1);
        const p1 = gridPoints[idx1];
        const p2 = gridPoints[idx2];
        if (p1.height !== null && p2.height !== null) {
          if (isInsideMask(p1.x, p1.z) && isInsideMask(p2.x, p2.z)) {
            addLineSegment({ x: p1.x, height: p1.height, z: p1.z }, { x: p2.x, height: p2.height, z: p2.z }, idx1, idx2);
          }
        }
      }
    }
    // Z direction
    for (let i = 0; i <= effectiveGridSize; i++) {
      for (let j = 0; j < effectiveGridSize; j++) {
        const idx1 = j * (effectiveGridSize + 1) + i;
        const idx2 = (j + 1) * (effectiveGridSize + 1) + i;
        const p1 = gridPoints[idx1];
        const p2 = gridPoints[idx2];
        if (p1.height !== null && p2.height !== null) {
          if (isInsideMask(p1.x, p1.z) && isInsideMask(p2.x, p2.z)) {
            addLineSegment({ x: p1.x, height: p1.height, z: p1.z }, { x: p2.x, height: p2.height, z: p2.z }, idx1, idx2);
          }
        }
      }
    }

    // Build fill geometry
    const fillIndicesMap = new Map<number, number>();
    let fillGeom: THREE.BufferGeometry | null = null;

    if (showFill) {
      const fillVertices: number[] = [];
      const fillColors: number[] = [];
      const fillIndices: number[] = [];
      const pointIndexMap = new Map<number, number>();
      let vertexCount = 0;

      for (let j = 0; j <= effectiveGridSize; j++) {
        for (let i = 0; i <= effectiveGridSize; i++) {
          const idx = j * (effectiveGridSize + 1) + i;
          const p = gridPoints[idx];
          if (p.height !== null && isInsideMask(p.x, p.z)) {
            fillVertices.push(p.x, p.height, p.z);
            const fillIdx = fillVertices.length - 2;
            fillIndicesMap.set(idx, fillIdx);
            const c = computeColor(p.x, p.z, p.height, targetSurfaceConfig, heightColorScale, minHeight, heightRange, false);
            fillColors.push(c.r, c.g, c.b);
            pointIndexMap.set(idx, vertexCount);
            vertexCount++;
          }
        }
      }

      for (let j = 0; j < effectiveGridSize; j++) {
        for (let i = 0; i < effectiveGridSize; i++) {
          const idx1 = j * (effectiveGridSize + 1) + i;
          const idx2 = j * (effectiveGridSize + 1) + (i + 1);
          const idx3 = (j + 1) * (effectiveGridSize + 1) + i;
          const idx4 = (j + 1) * (effectiveGridSize + 1) + (i + 1);
          if (pointIndexMap.has(idx1) && pointIndexMap.has(idx2) &&
            pointIndexMap.has(idx3) && pointIndexMap.has(idx4)) {
            const v1 = pointIndexMap.get(idx1)!;
            const v2 = pointIndexMap.get(idx2)!;
            const v3 = pointIndexMap.get(idx3)!;
            const v4 = pointIndexMap.get(idx4)!;
            fillIndices.push(v1, v3, v2);
            fillIndices.push(v2, v3, v4);
          }
        }
      }

      if (fillVertices.length > 0) {
        fillGeom = new THREE.BufferGeometry();
        fillGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(fillVertices), 3));
        fillGeom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(fillColors), 3));
        fillGeom.setIndex(fillIndices);
        fillGeom.computeVertexNormals();
      }
    }

    // Initialize section line data
    const SECTION_STEPS = 100;
    const sectionPointsVec: THREE.Vector3[] = [];
    const sectionColorsVec: [number, number, number][] = [];
    for (let i = 0; i < SECTION_STEPS * 2; i++) {
      sectionPointsVec.push(new THREE.Vector3(0, i * 0.01, 0));
      sectionColorsVec.push([1, 1, 0]);
    }

    const linePositions = new Float32Array(linePositionsFlat);
    const lineColors = new Float32Array(lineColorsFlat);
    gridDataRef.current = {
      points: gridPoints,
      minHeight,
      maxHeight,
      gridSize: effectiveGridSize,
      gridSpacing,
      center: effectiveCenter,
      lineIndicesMap,
      fillIndicesMap,
      linePositions,
      lineColors,
      sectionPointsVec,
      sectionColorsVec
    };

    let linesGeom: THREE.BufferGeometry | null = null;
    if (linePositionsFlat.length > 0) {
      linesGeom = new THREE.BufferGeometry();
      linesGeom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      linesGeom.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    }

    setGeometries({ fill: fillGeom, lines: linesGeom });
    setLineData(linePointsVec.length > 0 ? { points: linePointsVec, colors: lineColorsVec } : null);
    setSectionData({ points: sectionPointsVec, colors: sectionColorsVec });
    setIsGenerating(false);
  }, [scene, gl, effectiveGridSize, gridSpacing, heightColorScale, targetSurfaceConfig, effectiveCenter, circularMask, showFill]);

  // Excavation & Section update (throttle: run heavy work every 3 frames)
  useFrame(() => {
    if (!viewActive) return;

    frameCounterRef.current = (frameCounterRef.current + 1) % 3;
    const runHeavyThisFrame = frameCounterRef.current === 0;

    // Auto-follow logic (lightweight, every frame)
    if (gridCenterMode !== 'manual') {
      const threshold = gridSpacing * 5;
      const thresholdSq = threshold * threshold;
      let trackX = 0, trackZ = 0;

      if (gridCenterMode === 'vehicle' && vehiclePosition) {
        trackX = vehiclePosition.x;
        trackZ = vehiclePosition.z;
      } else if (gridCenterMode === 'bucket' && cuttingEdgeRef?.current) {
        const bucketPos = _worldPos.current;
        cuttingEdgeRef.current.getWorldPosition(bucketPos);
        trackX = bucketPos.x;
        trackZ = bucketPos.z;
      }

      const dx = trackX - lastGenCenterRef.current.x;
      const dz = trackZ - lastGenCenterRef.current.z;
      if (dx * dx + dz * dz > thresholdSq) {
        // Update ref immediately to prevent re-triggering on subsequent frames
        // before generateGridAsync has a chance to run
        lastGenCenterRef.current = { x: trackX, z: trackZ };
        setAutoCenter({ x: trackX, z: trackZ });
      }
    }

    if (!cuttingEdgeRef?.current || !gridDataRef.current) return;
    if (!runHeavyThisFrame) return;

    const worldPos = _worldPos.current;
    cuttingEdgeRef.current.getWorldPosition(worldPos);

    // Dirty check: skip excavation if cutting edge hasn't moved
    const ceKey = `${worldPos.x.toFixed(6)}_${worldPos.y.toFixed(6)}_${worldPos.z.toFixed(6)}`;
    if (ceKey === prevExcavationKey.current) {
      // Still need to run section update below if applicable
    } else {
      prevExcavationKey.current = ceKey;
      needsExcavation.current = true;
    }

    const { center, gridSize, gridSpacing: spacing, points, lineIndicesMap, fillIndicesMap, minHeight, maxHeight } = gridDataRef.current;
    const halfSize = (gridSize * spacing) / 2;
    const heightRange = maxHeight - minHeight;

    // Helper for bilinear interpolation
    const getHeightAt = (x: number, z: number) => {
      const localX = x - (center.x - halfSize);
      const localZ = z - (center.z - halfSize);
      const gx = localX / spacing;
      const gz = localZ / spacing;
      if (gx < 0 || gx > gridSize || gz < 0 || gz > gridSize) return null;
      const i = Math.floor(gx);
      const j = Math.floor(gz);
      const u = gx - i;
      const v = gz - j;
      const idx00 = j * (gridSize + 1) + i;
      const idx10 = j * (gridSize + 1) + (i + 1);
      const idx01 = (j + 1) * (gridSize + 1) + i;
      const idx11 = (j + 1) * (gridSize + 1) + (i + 1);
      const h00 = points[idx00]?.height;
      const h10 = points[idx10]?.height;
      const h01 = points[idx01]?.height;
      const h11 = points[idx11]?.height;
      if (h00 == null || h10 == null || h01 == null || h11 == null) return null;
      return (1 - u) * (1 - v) * h00 + u * (1 - v) * h10 + (1 - u) * v * h01 + u * v * h11;
    };

    // --- Section Line Update (with dirty check) ---
    if (showSectionOnly && sectionLineRef.current) {
      const range = halfSize;
      const steps = 100;

      let angle = vehicleRotation;
      if (sectionDirection === 'transverse') angle += Math.PI / 2;

      // Dirty check: skip update if position/rotation hasn't changed
      const sectionKey = `${worldPos.x.toFixed(6)}_${worldPos.z.toFixed(6)}_${angle.toFixed(4)}`;
      if (sectionKey !== prevSectionKey.current) {
        prevSectionKey.current = sectionKey;

        const dirX = Math.sin(angle);
        const dirZ = Math.cos(angle);

        const positions = sectionPositionsBuf.current;
        const colors = sectionColorsBuf.current;
        positions.length = 0;
        colors.length = 0;

        let prevPx = 0, prevPz = 0, prevH: number | null = null;

        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * 2 - 1;
          const offset = t * range;
          const px = worldPos.x + dirX * offset;
          const pz = worldPos.z + dirZ * offset;
          const h = getHeightAt(px, pz);

          if (h !== null && i > 0 && prevH !== null) {
            positions.push(prevPx, prevH, prevPz);
            positions.push(px, h, pz);
            colors.push(1, 1, 0);
            colors.push(1, 1, 0);
          }

          prevPx = px;
          prevPz = pz;
          prevH = h;
        }

        // Pad
        const totalFloats = steps * 2 * 3;
        while (positions.length < totalFloats) {
          positions.push(0, 0, 0);
          colors.push(0, 0, 0);
        }

        const geom = sectionLineRef.current.geometry;
        if (geom) {
          geom.setPositions(positions);
          geom.setColors(colors);
          geom.computeBoundingSphere();
        }
      }
    }

    if (!gridDataRef.current?.linePositions || !needsExcavation.current) return;
    needsExcavation.current = false;

    // Excavation (reduced radius for lighter updates)
    const EXCAVATION_RADIUS = gridSpacing * 2;
    const EXCAVATION_RADIUS_SQ = EXCAVATION_RADIUS * EXCAVATION_RADIUS;

    const localX = worldPos.x - (center.x - halfSize);
    const localZ = worldPos.z - (center.z - halfSize);

    const centerI = Math.round(localX / spacing);
    const centerJ = Math.round(localZ / spacing);
    const searchRange = Math.ceil(EXCAVATION_RADIUS / spacing);

    const minI = Math.max(0, centerI - searchRange);
    const maxI = Math.min(gridSize, centerI + searchRange);
    const minJ = Math.max(0, centerJ - searchRange);
    const maxJ = Math.min(gridSize, centerJ + searchRange);

    let hasUpdate = false;

    const linesPosArr = gridDataRef.current.linePositions;
    const linesColorArr = gridDataRef.current.lineColors;
    const fillPosAttr = geometries.fill?.attributes.position;
    const fillColorAttr = geometries.fill?.attributes.color;

    for (let j = minJ; j <= maxJ; j++) {
      for (let i = minI; i <= maxI; i++) {
        const idx = j * (gridSize + 1) + i;
        const p = points[idx];
        if (!p || p.height === null) continue;

        const dx = p.x - worldPos.x;
        const dz = p.z - worldPos.z;
        const distSq = dx * dx + dz * dz;

        if (distSq <= EXCAVATION_RADIUS_SQ && p.height > worldPos.y) {
          p.height = worldPos.y;
          hasUpdate = true;

          // Update line positions & colors
          const lineIdxs = lineIndicesMap.get(idx);
          if (lineIdxs) {
            const c = computeColor(p.x, p.z, p.height, targetSurfaceConfig, heightColorScale, minHeight, heightRange, false);
            for (const yIdx of lineIdxs) {
              linesPosArr[yIdx] = p.height;
              const vIdx = (yIdx - 1) / 3;
              const cBase = vIdx * 3;
              linesColorArr[cBase] = c.r;
              linesColorArr[cBase + 1] = c.g;
              linesColorArr[cBase + 2] = c.b;
            }
          }

          // Update fill
          if (fillPosAttr && fillColorAttr) {
            const fillIdx = fillIndicesMap.get(idx);
            if (fillIdx !== undefined) {
              const vertexIdx = (fillIdx - 1) / 3;
              fillPosAttr.setY(vertexIdx, p.height);
              const c = computeColor(p.x, p.z, p.height, targetSurfaceConfig, heightColorScale, minHeight, heightRange, false);
              fillColorAttr.setXYZ(vertexIdx, c.r, c.g, c.b);
            }
          }
        }
      }
    }

    if (hasUpdate) {
      if (linesMeshRef.current?.geometry) {
        const geom = linesMeshRef.current.geometry;
        (geom.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (geom.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      }
      if (fillPosAttr) (fillPosAttr as THREE.BufferAttribute).needsUpdate = true;
      if (fillColorAttr) (fillColorAttr as THREE.BufferAttribute).needsUpdate = true;
    }
  });

  useEffect(() => {
    if (!visible) {
      setGeometries({ fill: null, lines: null });
      setLineData(null);
      setSectionData(null);
      gridDataRef.current = null;
      return;
    }

    const timer = setTimeout(() => {
      generateGridAsync();
    }, 100);

    return () => {
      clearTimeout(timer);
      // Cancel any in-progress generation
      generationIdRef.current++;
    };
  }, [visible, effectiveGridSize, gridSpacing, heightColorScale, targetSurfaceConfig, effectiveCenter, circularMask, showFill, generateGridAsync]);

  // Continuous update: periodically re-generate heightmap
  useEffect(() => {
    if (!visible || !continuousUpdate) return;
    const interval = setInterval(() => {
      generateGridAsync();
    }, 500);
    return () => clearInterval(interval);
  }, [visible, continuousUpdate, generateGridAsync]);

  // Dispose render target on unmount
  useEffect(() => {
    return () => {
      renderTargetRef.current?.dispose();
      renderTargetRef.current = null;
      rtSizeRef.current = 0;
    };
  }, []);

  if (!visible) return null;

  return (
    <group>
      {geometries.fill && !showSectionOnly && (
        <mesh geometry={geometries.fill} ref={fillMeshRef}>
          <meshBasicMaterial
            vertexColors
            side={THREE.DoubleSide}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
            transparent={true}
            opacity={opacity}
          />
        </mesh>
      )}
      {geometries.lines && !showSectionOnly && (
        <lineSegments ref={linesMeshRef} geometry={geometries.lines}>
          <lineBasicMaterial vertexColors transparent opacity={opacity} />
        </lineSegments>
      )}
      {sectionData && showSectionOnly && (
        <Line
          ref={sectionLineRef}
          points={sectionData.points}
          vertexColors={sectionData.colors}
          segments
          lineWidth={lineWidth}
          color="white"
          transparent
          opacity={opacity}
          depthTest={false}
          renderOrder={999}
          frustumCulled={false}
        />
      )}
    </group>
  );
}
