const pageTitle = document.getElementById("pageTitle");
const infoBody = document.getElementById("infoBody");
const emptyState = document.getElementById("emptyState");

function createCell(text) {
  const td = document.createElement("td");
  td.textContent = text;
  return td;
}

function renderTable(provinceName, rows) {
  infoBody.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  rows
    .slice()
    .sort((a, b) => Number(b.year) - Number(a.year))
    .forEach((item, index) => {
      const tr = document.createElement("tr");
      tr.appendChild(createCell(String(index + 1)));
      tr.appendChild(createCell(item.school || "-"));
      tr.appendChild(createCell(item.competition || "-"));
      tr.appendChild(createCell(item.award || "-"));
      tr.appendChild(createCell(String(item.year || "-")));
      tr.appendChild(createCell(item.note || "-"));
      infoBody.appendChild(tr);
    });

  pageTitle.textContent = `${provinceName} 高校竞赛获奖信息`;
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const provinceName = params.get("province") || "";

  if (!provinceName) {
    pageTitle.textContent = "未指定省份";
    emptyState.hidden = false;
    emptyState.textContent = "URL 中未包含 province 参数。";
    return;
  }

  pageTitle.textContent = `${provinceName} 高校竞赛获奖信息`;

  try {
    const response = await fetch("data.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`加载失败：${response.status}`);
    }

    const data = await response.json();
    renderTable(provinceName, data[provinceName] || []);
  } catch (error) {
    emptyState.hidden = false;
    emptyState.textContent = "数据加载失败，请检查 data.json 是否存在且格式正确。";
    pageTitle.textContent = `${provinceName} 高校竞赛获奖信息`;
    // 仅保留控制台日志，方便本地调试。
    console.error(error);
  }
}

init();
