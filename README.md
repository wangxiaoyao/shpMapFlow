# shpMapFlow

about Map

## 技术要点：

1 source中的地图资源：标准 WGS84， 提供完整的.shp + .shx + .dbf + .prj + .cpg文件，从而达成做地图的精细边界；
互。

2 使用 shapefile npm 包从 source 资源生成地图资产。利用package.json的构建指令。得到： src/china-province.geojson 地理坐标文件。以及src/data.json的mock数据文件。XXX.geojson 的“精细度”由原始点密度决定，Canvas 负责把这些点高效画出来并做交互

3 增加地图说明：以下为文案。

```
数据来源：本图行政区划边界基于高德地图 Web 服务 API (LBS Amap) 数据生成。
坐标系说明：采用 GCJ-02 坐标系（中国测绘局标准偏移坐标）。
法律声明：本成果仅用于[此处填写用途，如：学术研究/数据可视化展示]，地图底图及边界表达符合国家相关地图管理规定。
```
