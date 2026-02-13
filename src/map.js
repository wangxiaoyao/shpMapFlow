const canvas = document.getElementById("chinaMap");
const ctx = canvas.getContext("2d");
const hoverProvinceText = document.getElementById("hoverProvince");

const GEOJSON_URL = "china-province.geojson";
const PALETTE = ["#cfe1ff", "#c9eddc", "#ffe5c5", "#f7d2d2", "#d7dcff", "#c5e6ff", "#d4f2d2"];

const baseLayerCanvas = document.createElement("canvas");
const baseLayerCtx = baseLayerCanvas.getContext("2d");

const view = {
  dpr: Math.max(window.devicePixelRatio || 1, 1),
  width: 0,
  height: 0,
  scale: 1,
  offsetX: 0,
  offsetY: 0
};

const state = {
  ready: false,
  provinces: [],
  provinceById: new Map(),
  renderOrder: [],
  hitOrder: [],
  bounds: null,
  hoveredId: null,
  animationRunning: false
};

function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function normalizeProvinceName(name) {
  return String(name || "")
    .replace(/维吾尔自治区$/, "")
    .replace(/回族自治区$/, "")
    .replace(/壮族自治区$/, "")
    .replace(/自治区$/, "")
    .replace(/特别行政区$/, "")
    .replace(/省$/, "")
    .replace(/市$/, "");
}

function mixColor(hexColor, ratio) {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const blend = (value) => Math.round(value + (255 - value) * ratio);
  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
}

function geometryToRings(geometry) {
  if (!geometry || !geometry.type || !Array.isArray(geometry.coordinates)) {
    return [];
  }

  if (geometry.type === "Polygon") {
    return geometry.coordinates.filter((ring) => Array.isArray(ring) && ring.length >= 3);
  }

  if (geometry.type === "MultiPolygon") {
    const rings = [];
    for (const polygon of geometry.coordinates) {
      if (!Array.isArray(polygon)) continue;
      for (const ring of polygon) {
        if (Array.isArray(ring) && ring.length >= 3) {
          rings.push(ring);
        }
      }
    }
    return rings;
  }

  return [];
}

function computeRingArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % ring.length];
    sum += x0 * y1 - x1 * y0;
  }
  return Math.abs(sum / 2);
}

function computeBoundsFromRings(rings) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const ring of rings) {
    for (const [x, y] of ring) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  if (!Number.isFinite(minX)) {
    return null;
  }

  return { minX, maxX, minY, maxY };
}

function buildProvinceModels(featureCollection) {
  const features = Array.isArray(featureCollection.features) ? featureCollection.features : [];

  return features.map((feature, index) => {
    const properties = feature.properties || {};
    const fullName = properties.fullName || properties.pr_name || "";
    const name = properties.name || normalizeProvinceName(fullName);
    const adcode = String(properties.adcode || properties.pr_adcode || "");
    const rings = geometryToRings(feature.geometry);
    const bounds = computeBoundsFromRings(rings);
    const area = rings.reduce((acc, ring) => acc + computeRingArea(ring), 0);

    const centroid = bounds
      ? {
          x: (bounds.minX + bounds.maxX) / 2,
          y: (bounds.minY + bounds.maxY) / 2
        }
      : { x: 0, y: 0 };

    return {
      id: `province-${index}`,
      adcode,
      fullName,
      name,
      rings,
      bounds,
      area,
      centroid,
      color: PALETTE[hashString(name || adcode || String(index)) % PALETTE.length],
      hover: 0,
      hitRadiusPx: 12,
      screenRings: [],
      screenCentroid: { x: 0, y: 0 },
      basePath: new Path2D()
    };
  });
}

function computeMapBounds(provinces) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const province of provinces) {
    if (!province.bounds) continue;
    minX = Math.min(minX, province.bounds.minX);
    maxX = Math.max(maxX, province.bounds.maxX);
    minY = Math.min(minY, province.bounds.minY);
    maxY = Math.max(maxY, province.bounds.maxY);
  }

  if (!Number.isFinite(minX)) {
    return null;
  }

  return { minX, maxX, minY, maxY };
}

function mapToScreen([x, y]) {
  const { minX, maxY } = state.bounds;
  return {
    x: (x - minX) * view.scale + view.offsetX,
    y: (maxY - y) * view.scale + view.offsetY
  };
}

function screenToMap(screenX, screenY) {
  const { minX, maxY } = state.bounds;
  return {
    x: (screenX - view.offsetX) / view.scale + minX,
    y: maxY - (screenY - view.offsetY) / view.scale
  };
}

function traceScreenRings(context, rings, centroid, scale = 1, lift = 0) {
  const cx = centroid.x;
  const cy = centroid.y;

  context.beginPath();
  for (const ring of rings) {
    if (ring.length === 0) continue;

    const [x0, y0] = ring[0];
    context.moveTo(cx + (x0 - cx) * scale, cy + (y0 - cy) * scale - lift);

    for (let i = 1; i < ring.length; i += 1) {
      const [x, y] = ring[i];
      context.lineTo(cx + (x - cx) * scale, cy + (y - cy) * scale - lift);
    }

    context.closePath();
  }
}

function buildBasePath(rings) {
  const path = new Path2D();
  for (const ring of rings) {
    if (ring.length === 0) continue;
    path.moveTo(ring[0][0], ring[0][1]);
    for (let i = 1; i < ring.length; i += 1) {
      path.lineTo(ring[i][0], ring[i][1]);
    }
    path.closePath();
  }
  return path;
}

function rebuildScreenGeometry() {
  for (const province of state.provinces) {
    province.screenRings = province.rings.map((ring) =>
      ring.map((point) => {
        const projected = mapToScreen(point);
        return [projected.x, projected.y];
      })
    );

    const centroidPoint = mapToScreen([province.centroid.x, province.centroid.y]);
    province.screenCentroid = centroidPoint;
    province.basePath = buildBasePath(province.screenRings);

    if (province.bounds) {
      const widthPx = (province.bounds.maxX - province.bounds.minX) * view.scale;
      const heightPx = (province.bounds.maxY - province.bounds.minY) * view.scale;
      province.hitRadiusPx = Math.max(9, Math.min(24, Math.sqrt(widthPx * heightPx) * 0.12));
    } else {
      province.hitRadiusPx = 9;
    }
  }
}

function pointInRing(point, ring) {
  const { x, y } = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

function pointInProvince(point, province) {
  if (!province.bounds) return false;

  if (
    point.x < province.bounds.minX ||
    point.x > province.bounds.maxX ||
    point.y < province.bounds.minY ||
    point.y > province.bounds.maxY
  ) {
    return false;
  }

  let inside = false;
  for (const ring of province.rings) {
    if (pointInRing(point, ring)) {
      inside = !inside;
    }
  }

  return inside;
}

function distanceSquared(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function getProvinceAtPosition(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const px = clientX - rect.left;
  const py = clientY - rect.top;
  const mapPoint = screenToMap(px, py);

  for (const province of state.hitOrder) {
    if (pointInProvince(mapPoint, province)) {
      return province;
    }
  }

  for (const province of state.hitOrder) {
    if (
      distanceSquared(px, py, province.screenCentroid.x, province.screenCentroid.y) <=
      province.hitRadiusPx * province.hitRadiusPx
    ) {
      return province;
    }
  }

  return null;
}

function drawBackground(context) {
  const gradient = context.createLinearGradient(0, 0, 0, view.height);
  gradient.addColorStop(0, "#f8fbff");
  gradient.addColorStop(1, "#e5f0ff");

  context.fillStyle = gradient;
  context.fillRect(0, 0, view.width, view.height);

  context.strokeStyle = "rgba(120, 153, 205, 0.18)";
  context.lineWidth = 1;

  for (let x = 30; x < view.width; x += 56) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, view.height);
    context.stroke();
  }

  for (let y = 30; y < view.height; y += 56) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(view.width, y);
    context.stroke();
  }
}

function rebuildBaseLayer() {
  baseLayerCanvas.width = canvas.width;
  baseLayerCanvas.height = canvas.height;

  baseLayerCtx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  baseLayerCtx.clearRect(0, 0, view.width, view.height);

  drawBackground(baseLayerCtx);

  baseLayerCtx.lineJoin = "round";
  baseLayerCtx.lineCap = "round";

  for (const province of state.renderOrder) {
    baseLayerCtx.fillStyle = province.color;
    baseLayerCtx.strokeStyle = "#6a83ab";
    baseLayerCtx.lineWidth = 0.85;
    baseLayerCtx.fill(province.basePath, "evenodd");
    baseLayerCtx.stroke(province.basePath);
  }
}

function drawHoveredProvince(province) {
  const liftScale = 1 + province.hover * 0.05;
  const liftY = province.hover * 10;

  ctx.save();

  if (province.hover > 0.02) {
    ctx.shadowColor = "rgba(22, 58, 111, 0.3)";
    ctx.shadowBlur = 18 * province.hover;
    ctx.shadowOffsetY = 10 * province.hover;
  }

  traceScreenRings(ctx, province.screenRings, province.screenCentroid, liftScale, liftY);

  ctx.fillStyle = mixColor(province.color, province.hover * 0.45);
  ctx.strokeStyle = province.hover > 0.2 ? "#205ca7" : "#5d7dad";
  ctx.lineWidth = 1.1 + province.hover * 0.8;
  ctx.fill("evenodd");

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.stroke();

  if (province.hover > 0.35) {
    ctx.fillStyle = "#173765";
    ctx.font = "600 13px 'Noto Sans SC', 'PingFang SC', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(province.name, province.screenCentroid.x, province.screenCentroid.y - 14 - liftY);
  }

  ctx.restore();
}

function render() {
  if (!state.ready) return;

  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.clearRect(0, 0, view.width, view.height);
  ctx.drawImage(baseLayerCanvas, 0, 0, view.width, view.height);

  const active = state.provinces
    .filter((province) => province.hover > 0.001)
    .sort((a, b) => a.hover - b.hover);

  for (const province of active) {
    drawHoveredProvince(province);
  }
}

function animationTick() {
  let hasMotion = false;

  for (const province of state.provinces) {
    const target = province.id === state.hoveredId ? 1 : 0;
    province.hover += (target - province.hover) * 0.2;

    if (Math.abs(target - province.hover) > 0.001) {
      hasMotion = true;
    } else {
      province.hover = target;
    }
  }

  render();

  if (hasMotion) {
    window.requestAnimationFrame(animationTick);
  } else {
    state.animationRunning = false;
  }
}

function startAnimation() {
  if (state.animationRunning) return;
  state.animationRunning = true;
  window.requestAnimationFrame(animationTick);
}

function setHoveredProvince(province) {
  const nextId = province ? province.id : null;
  if (nextId === state.hoveredId) return;

  state.hoveredId = nextId;
  hoverProvinceText.textContent = `当前省份：${province ? province.name : "无"}`;
  canvas.style.cursor = province ? "pointer" : "default";
  startAnimation();
}

function navigateToHoveredProvince() {
  if (!state.hoveredId) return;
  const province = state.provinceById.get(state.hoveredId);
  if (!province) return;
  window.location.href = `showInfo.html?province=${encodeURIComponent(province.name)}`;
}

function setHoverByClientPoint(clientX, clientY) {
  if (!state.ready || !state.bounds) return;
  const province = getProvinceAtPosition(clientX, clientY);
  setHoveredProvince(province);
}

function resizeCanvas() {
  if (!state.ready || !state.bounds) return;

  const rect = canvas.getBoundingClientRect();
  view.width = rect.width;
  view.height = rect.height;
  view.dpr = Math.max(window.devicePixelRatio || 1, 1);

  canvas.width = Math.round(view.width * view.dpr);
  canvas.height = Math.round(view.height * view.dpr);

  const mapWidth = state.bounds.maxX - state.bounds.minX;
  const mapHeight = state.bounds.maxY - state.bounds.minY;
  const padding = 28;

  view.scale = Math.min(
    (view.width - padding * 2) / mapWidth,
    (view.height - padding * 2) / mapHeight
  );

  view.offsetX = (view.width - mapWidth * view.scale) / 2;
  view.offsetY = (view.height - mapHeight * view.scale) / 2;

  rebuildScreenGeometry();
  rebuildBaseLayer();
}

async function loadProvinceData() {
  const response = await fetch(GEOJSON_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`GeoJSON 加载失败：${response.status}`);
  }

  const geojson = await response.json();
  return buildProvinceModels(geojson);
}

function bindEvents() {
  canvas.addEventListener("mousemove", (event) => {
    setHoverByClientPoint(event.clientX, event.clientY);
  });

  canvas.addEventListener("mouseleave", () => {
    setHoveredProvince(null);
  });

  canvas.addEventListener("click", () => {
    navigateToHoveredProvince();
  });

  canvas.addEventListener(
    "touchstart",
    (event) => {
      const touch = event.changedTouches[0];
      if (!touch) return;

      setHoverByClientPoint(touch.clientX, touch.clientY);
      if (!state.hoveredId) return;

      event.preventDefault();
      navigateToHoveredProvince();
    },
    { passive: false }
  );

  window.addEventListener("resize", () => {
    if (!state.ready) return;
    resizeCanvas();
    render();
  });
}

async function init() {
  hoverProvinceText.textContent = "当前省份：地图加载中...";

  try {
    const provinces = await loadProvinceData();
    state.provinces = provinces;
    state.provinceById = new Map(provinces.map((province) => [province.id, province]));
    state.renderOrder = provinces.slice().sort((a, b) => b.area - a.area);
    state.hitOrder = provinces.slice().sort((a, b) => a.area - b.area);
    state.bounds = computeMapBounds(provinces);

    if (!state.bounds) {
      throw new Error("地图边界数据为空");
    }

    state.ready = true;
    hoverProvinceText.textContent = "当前省份：无";

    resizeCanvas();
    render();
  } catch (error) {
    hoverProvinceText.textContent = "当前省份：加载失败（请用本地服务器打开）";
    canvas.style.cursor = "not-allowed";
    console.error(error);
  }
}

bindEvents();
init();
