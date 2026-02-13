# shpMapFlow

about Map

## 技术要点：

1 source中的地图资源：标准 WGS84， 提供完整的.shp + .shx + .dbf + .prj + .cpg文件，从而达成做地图的精细边界；
互。

2 使用 shapefile npm 包从 source 资源生成地图资产。利用package.json的构建指令。得到： src/china-province.geojson 地理坐标文件。以及src/data.json的mock数据文件。XXX.geojson 的“精细度”由原始点密度决定，Canvas 负责把这些点高效画出来并做交互
