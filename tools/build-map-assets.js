const fs = require("fs");
const path = require("path");
const shapefile = require("shapefile");

const projectRoot = path.resolve(__dirname, "..");
const sourceDir = path.join(projectRoot, "source/chinaMap/2. Province");
const shpPath = path.join(sourceDir, "province.shp");
const dbfPath = path.join(sourceDir, "province.dbf");
const outGeojsonPath = path.join(projectRoot, "src/china-province.geojson");
const outDataPath = path.join(projectRoot, "src/data.json");

const competitions = [
  "中国国际大学生创新大赛",
  "全国大学生电子设计竞赛",
  "全国大学生数学建模竞赛",
  "中国机器人大赛",
  "全国大学生智能汽车竞赛",
  "全国大学生结构设计竞赛"
];

const awards = ["国家级一等奖", "国家级二等奖", "省级特等奖", "省级一等奖"];

const notes = [
  "聚焦人工智能与工程应用场景",
  "由跨学院联合团队完成",
  "项目已完成校内外路演展示",
  "围绕产业实际需求开展攻关"
];

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

function pickTwoSchools(name, fullName) {
  if (name === "北京") return ["清华大学", "北京航空航天大学"];
  if (name === "上海") return ["复旦大学", "上海交通大学"];
  if (name === "天津") return ["天津大学", "南开大学"];
  if (name === "重庆") return ["重庆大学", "西南大学"];
  if (name === "香港") return ["香港大学", "香港中文大学"];
  if (name === "澳门") return ["澳门大学", "澳门科技大学"];
  if (name === "台湾") return ["台湾大学", "清华大学（新竹）"];

  if (name.length <= 2) {
    return [`${name}大学`, `${name}理工大学`];
  }

  const base = name || normalizeProvinceName(fullName);
  return [`${base}大学`, `${base}师范大学`];
}

function makeMockRows(name, fullName, adcode) {
  const seed = Number(adcode) || 0;
  const schools = pickTwoSchools(name, fullName);

  return [0, 1].map((index) => ({
    school: schools[index],
    competition: competitions[(seed + index) % competitions.length],
    award: awards[(seed + index) % awards.length],
    year: 2022 + ((seed + index) % 4),
    note: notes[(seed + index) % notes.length]
  }));
}

function buildFeature(feature) {
  const properties = feature.properties || {};
  const fullName = properties.pr_name || properties.fullName || "";
  const name = normalizeProvinceName(fullName);
  const adcode = String(properties.pr_adcode || properties.adcode || "");

  return {
    type: "Feature",
    properties: {
      adcode,
      fullName,
      name,
      countryAdcode: String(properties.cn_adcode || ""),
      countryName: String(properties.cn_name || "")
    },
    geometry: feature.geometry
  };
}

async function main() {
  const source = await shapefile.read(shpPath, dbfPath, { encoding: "utf-8" });
  const features = source.features.map(buildFeature);

  const geojson = {
    type: "FeatureCollection",
    bbox: source.bbox,
    features
  };

  const data = {};
  for (const feature of features) {
    const { name, fullName, adcode } = feature.properties;
    data[name] = makeMockRows(name, fullName, adcode);
  }

  fs.writeFileSync(outGeojsonPath, `${JSON.stringify(geojson)}\n`, "utf8");
  fs.writeFileSync(outDataPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  console.log(`已生成 ${outGeojsonPath}`);
  console.log(`已生成 ${outDataPath}`);
  console.log(`省份数量: ${features.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
