const canvas = document.getElementById("chinaMap");
const ctx = canvas.getContext("2d");
const hoverProvinceText = document.getElementById("hoverProvince");

const UNIT = 58;

const TILE_DEFS = [
  { name: "新疆", x: 0.2, y: 2.1, w: 2.5, h: 2.2 },
  { name: "西藏", x: 1.3, y: 6.2, w: 3.1, h: 1.8 },
  { name: "青海", x: 3.9, y: 4.5, w: 2.2, h: 1.9 },
  { name: "甘肃", x: 5.7, y: 3.6, w: 2.0, h: 2.3 },
  { name: "宁夏", x: 7.2, y: 4.4, w: 0.9, h: 0.9 },
  { name: "内蒙古", x: 5.9, y: 1.2, w: 4.4, h: 1.7 },
  { name: "陕西", x: 7.4, y: 5.4, w: 1.5, h: 1.5 },
  { name: "山西", x: 8.8, y: 4.7, w: 1.3, h: 1.3 },
  { name: "河北", x: 9.9, y: 3.9, w: 1.7, h: 1.5 },
  { name: "北京", x: 11.15, y: 3.74, w: 0.42, h: 0.35 },
  { name: "天津", x: 11.56, y: 4.12, w: 0.36, h: 0.34 },
  { name: "辽宁", x: 11.3, y: 2.8, w: 1.3, h: 1.0 },
  { name: "吉林", x: 12.3, y: 2.0, w: 1.1, h: 1.0 },
  { name: "黑龙江", x: 13.1, y: 0.9, w: 1.6, h: 1.6 },
  { name: "山东", x: 11.0, y: 5.2, w: 1.5, h: 1.0 },
  { name: "河南", x: 9.3, y: 5.8, w: 1.6, h: 1.3 },
  { name: "江苏", x: 11.5, y: 6.2, w: 1.0, h: 0.9 },
  { name: "上海", x: 12.45, y: 6.92, w: 0.34, h: 0.28 },
  { name: "安徽", x: 10.6, y: 6.5, w: 1.0, h: 1.0 },
  { name: "浙江", x: 12.1, y: 7.5, w: 1.0, h: 1.0 },
  { name: "福建", x: 12.0, y: 8.7, w: 1.0, h: 1.0 },
  { name: "江西", x: 10.8, y: 7.9, w: 1.0, h: 1.0 },
  { name: "湖北", x: 9.1, y: 7.3, w: 1.6, h: 1.3 },
  { name: "湖南", x: 8.9, y: 8.7, w: 1.5, h: 1.2 },
  { name: "重庆", x: 8.1, y: 7.7, w: 0.8, h: 0.9 },
  { name: "四川", x: 6.5, y: 6.9, w: 1.9, h: 1.9 },
  { name: "贵州", x: 7.8, y: 9.1, w: 1.1, h: 0.9 },
  { name: "云南", x: 5.5, y: 9.2, w: 1.9, h: 1.5 },
  { name: "广西", x: 9.2, y: 10.1, w: 1.3, h: 1.1 },
  { name: "广东", x: 10.6, y: 10.1, w: 1.9, h: 1.1 },
  { name: "海南", x: 10.8, y: 11.6, w: 0.8, h: 0.6 },
  { name: "台湾", x: 13.5, y: 9.8, w: 0.6, h: 1.0 },
  { name: "香港", x: 11.84, y: 11.08, w: 0.26, h: 0.22 },
  { name: "澳门", x: 11.58, y: 11.13, w: 0.22, h: 0.18 }
];

const PALETTE = [
  "#cae0ff",
  "#c2f0df",
  "#ffe3bf",
  "#f7d4d4",
  "#d2dcff",
  "#bfe7ff",
  "#d2f2ce"
];

function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

function createRandom(seed) {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function buildPolygon(tile) {
  const rand = createRandom(hashString(tile.name));
  const x = tile.x * UNIT;
  const y = tile.y * UNIT;
  const w = tile.w * UNIT;
  const h = tile.h * UNIT;

  return [
    [x + w * (0.08 + rand() * 0.06), y + h * (0.08 + rand() * 0.05)],
    [x + w * (0.58 + rand() * 0.14), y + h * (0.03 + rand() * 0.06)],
    [x + w * (0.93 - rand() * 0.04), y + h * (0.18 + rand() * 0.08)],
    [x + w * (0.9 - rand() * 0.06), y + h * (0.76 + rand() * 0.11)],
    [x + w * (0.46 + rand() * 0.1), y + h * (0.96 - rand() * 0.03)],
    [x + w * (0.06 + rand() * 0.06), y + h * (0.78 + rand() * 0.12)]
  ];
}

function getCentroid(points) {
  let signedArea = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    const area = x0 * y1 - x1 * y0;
    signedArea += area;
    cx += (x0 + x1) * area;
    cy += (y0 + y1) * area;
  }

  signedArea *= 0.5;
  if (!signedArea) {
    return {
      x: points.reduce((acc, [x]) => acc + x, 0) / points.length,
      y: points.reduce((acc, [, y]) => acc + y, 0) / points.length
    };
  }

  return {
    x: cx / (6 * signedArea),
    y: cy / (6 * signedArea)
  };
}

function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    sum += x0 * y1 - x1 * y0;
  }
  return Math.abs(sum / 2);
}

function pointInPolygon(point, polygon) {
  const { x, y } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function mixColor(hexColor, ratio) {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  const blend = (v) => Math.round(v + (255 - v) * ratio);
  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
}

const provinces = TILE_DEFS.map((tile, index) => {
  const points = buildPolygon(tile);
  const centroid = getCentroid(points);
  const area = polygonArea(points);

  return {
    id: `province-${index}`,
    name: tile.name,
    points,
    centroid,
    color: PALETTE[index % PALETTE.length],
    hover: 0,
    hitRadius: Math.max(Math.sqrt(area) * 0.16, 14)
  };
});

function getBounds() {
  const xs = provinces.flatMap((province) => province.points.map((point) => point[0]));
  const ys = provinces.flatMap((province) => province.points.map((point) => point[1]));
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
}

const bounds = getBounds();
const view = {
  dpr: Math.max(window.devicePixelRatio || 1, 1),
  width: 0,
  height: 0,
  scale: 1,
  offsetX: 0,
  offsetY: 0
};

let hoveredId = null;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  view.width = rect.width;
  view.height = rect.height;
  view.dpr = Math.max(window.devicePixelRatio || 1, 1);

  canvas.width = Math.round(rect.width * view.dpr);
  canvas.height = Math.round(rect.height * view.dpr);

  const mapWidth = bounds.maxX - bounds.minX;
  const mapHeight = bounds.maxY - bounds.minY;
  const padding = 34;

  view.scale = Math.min(
    (view.width - padding * 2) / mapWidth,
    (view.height - padding * 2) / mapHeight
  );

  view.offsetX = (view.width - mapWidth * view.scale) / 2 - bounds.minX * view.scale;
  view.offsetY = (view.height - mapHeight * view.scale) / 2 - bounds.minY * view.scale;
}

function mapToScreen([x, y]) {
  return [x * view.scale + view.offsetX, y * view.scale + view.offsetY];
}

function screenToMap(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  return {
    x: (x - view.offsetX) / view.scale,
    y: (y - view.offsetY) / view.scale
  };
}

function getProvinceAt(point) {
  for (let i = provinces.length - 1; i >= 0; i -= 1) {
    const province = provinces[i];
    if (pointInPolygon(point, province.points)) {
      return province;
    }
  }

  for (let i = provinces.length - 1; i >= 0; i -= 1) {
    const province = provinces[i];
    if (distance(point, province.centroid) <= province.hitRadius) {
      return province;
    }
  }

  return null;
}

function getAnimatedPoints(province) {
  if (province.hover < 0.001) return province.points;

  const scale = 1 + province.hover * 0.06;
  const lift = (8 / view.scale) * province.hover;
  const { x: cx, y: cy } = province.centroid;

  return province.points.map(([x, y]) => [cx + (x - cx) * scale, cy + (y - cy) * scale - lift]);
}

function drawProvince(province) {
  const points = getAnimatedPoints(province);
  const first = mapToScreen(points[0]);

  ctx.beginPath();
  ctx.moveTo(first[0], first[1]);
  for (let i = 1; i < points.length; i += 1) {
    const [x, y] = mapToScreen(points[i]);
    ctx.lineTo(x, y);
  }
  ctx.closePath();

  const highlight = province.hover * 0.45;
  ctx.fillStyle = mixColor(province.color, highlight);
  ctx.strokeStyle = province.hover > 0.15 ? "#255da8" : "#6e82a8";
  ctx.lineWidth = 1.2;

  if (province.hover > 0.02) {
    ctx.shadowColor = "rgba(26, 62, 119, 0.34)";
    ctx.shadowBlur = 16 * province.hover;
    ctx.shadowOffsetY = 8 * province.hover;
  } else {
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();

  const [tx, ty] = mapToScreen([province.centroid.x, province.centroid.y - province.hover * (7 / view.scale)]);
  ctx.fillStyle = "#1f355b";
  ctx.font = "12px 'Noto Sans SC', 'PingFang SC', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(province.name, tx, ty);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, view.height);
  gradient.addColorStop(0, "#f8fbff");
  gradient.addColorStop(1, "#e5f0ff");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, view.width, view.height);

  ctx.strokeStyle = "rgba(120, 153, 205, 0.18)";
  ctx.lineWidth = 1;

  for (let x = 30; x < view.width; x += 56) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, view.height);
    ctx.stroke();
  }

  for (let y = 30; y < view.height; y += 56) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(view.width, y);
    ctx.stroke();
  }
}

function render() {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.clearRect(0, 0, view.width, view.height);

  drawBackground();

  for (const province of provinces) {
    drawProvince(province);
  }
}

function tick() {
  let active = false;

  for (const province of provinces) {
    const target = province.id === hoveredId ? 1 : 0;
    province.hover += (target - province.hover) * 0.2;
    if (Math.abs(target - province.hover) > 0.001) {
      active = true;
    } else {
      province.hover = target;
    }
  }

  render();
  if (active) {
    window.requestAnimationFrame(tick);
  }
}

function setHoverByPoint(clientX, clientY) {
  const point = screenToMap(clientX, clientY);
  const province = getProvinceAt(point);
  const nextId = province ? province.id : null;

  if (nextId === hoveredId) return;

  hoveredId = nextId;
  hoverProvinceText.textContent = `当前省份：${province ? province.name : "无"}`;
  canvas.style.cursor = province ? "pointer" : "default";

  window.requestAnimationFrame(tick);
}

canvas.addEventListener("mousemove", (event) => {
  setHoverByPoint(event.clientX, event.clientY);
});

canvas.addEventListener("mouseleave", () => {
  hoveredId = null;
  hoverProvinceText.textContent = "当前省份：无";
  canvas.style.cursor = "default";
  window.requestAnimationFrame(tick);
});

canvas.addEventListener("click", () => {
  if (!hoveredId) return;
  const province = provinces.find((item) => item.id === hoveredId);
  if (!province) return;
  window.location.href = `showInfo.html?province=${encodeURIComponent(province.name)}`;
});

canvas.addEventListener(
  "touchstart",
  (event) => {
    const touch = event.changedTouches[0];
    if (!touch) return;

    setHoverByPoint(touch.clientX, touch.clientY);

    if (!hoveredId) return;
    const province = provinces.find((item) => item.id === hoveredId);
    if (!province) return;

    event.preventDefault();
    window.location.href = `showInfo.html?province=${encodeURIComponent(province.name)}`;
  },
  { passive: false }
);

window.addEventListener("resize", () => {
  resizeCanvas();
  render();
});

resizeCanvas();
render();
