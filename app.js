// ===========================
// 기상청 단기예보 조회 앱
// 학번: 1114  이름: 이상건
// ===========================

const API_KEY = "599f4697dbbe04db4184154f9f82144d0bd5b5c234f1f489e057dff5ce68f300";
const BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";

// 지역 이름 매핑
const REGION_NAMES = {
  "60,127": "서울", "55,124": "인천", "89,90": "대전",
  "102,84": "대구", "98,76": "부산", "58,74": "광주",
  "67,100": "수원", "73,134": "춘천", "92,131": "강릉", "69,107": "이천"
};

// 하늘 상태 코드 → 텍스트 & 이모지
const SKY_INFO = {
  "1": { text: "맑음",   icon: "☀️" },
  "3": { text: "구름많음", icon: "⛅" },
  "4": { text: "흐림",   icon: "☁️" }
};

// 강수 형태 코드 → 텍스트 & 이모지
const PTY_INFO = {
  "0": null,
  "1": { text: "비",         icon: "🌧️" },
  "2": { text: "비/눈",      icon: "🌨️" },
  "3": { text: "눈",         icon: "❄️" },
  "4": { text: "소나기",     icon: "⛈️" }
};

// 현재 기준 시간 계산 (단기예보는 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300)
function getBaseTime() {
  const now = new Date();
  const hour = now.getHours();
  const baseTimes = [2, 5, 8, 11, 14, 17, 20, 23];
  let base = baseTimes.filter(t => hour >= t).pop();
  if (base === undefined) {
    // 자정~02시 이전이면 전날 23시 기준
    now.setDate(now.getDate() - 1);
    base = 23;
  }
  return {
    date: now.toISOString().slice(0, 10).replace(/-/g, ""),
    time: String(base).padStart(2, "0") + "00"
  };
}

// API 호출
async function fetchForecast(nx, ny) {
  const { date, time } = getBaseTime();
  const params = new URLSearchParams({
    serviceKey: API_KEY,
    pageNo: 1,
    numOfRows: 300,
    dataType: "JSON",
    base_date: date,
    base_time: time,
    nx,
    ny
  });
  const url = `${BASE_URL}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const code = json?.response?.header?.resultCode;
  if (code !== "00") throw new Error(`API 오류: ${json?.response?.header?.resultMsg}`);
  return json.response.body.items.item;
}

// 아이템 배열을 { "날짜시간": { 카테고리: 값 } } 형태로 파싱
function parseItems(items) {
  const map = {};
  items.forEach(({ fcstDate, fcstTime, category, fcstValue }) => {
    const key = `${fcstDate}_${fcstTime}`;
    if (!map[key]) map[key] = { date: fcstDate, time: fcstTime };
    map[key][category] = fcstValue;
  });
  return Object.values(map).sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time)
  );
}

// 날씨 아이콘 결정
function getWeatherIcon(sky, pty) {
  if (PTY_INFO[pty]) return PTY_INFO[pty].icon;
  return (SKY_INFO[sky] || SKY_INFO["1"]).icon;
}
function getWeatherText(sky, pty) {
  if (PTY_INFO[pty]) return PTY_INFO[pty].text;
  return (SKY_INFO[sky] || SKY_INFO["1"]).text;
}

// 시간 포맷 HH00 → HH:00
function fmtTime(t) {
  return t.slice(0, 2) + ":" + t.slice(2);
}
// 날짜 포맷 YYYYMMDD → MM/DD
function fmtDate(d) {
  return d.slice(4, 6) + "/" + d.slice(6, 8);
}

// UI 렌더
function renderSummary(first, regionKey) {
  const sky  = first.SKY  || "1";
  const pty  = first.PTY  || "0";
  const temp = first.TMP  ?? "--";
  const hum  = first.REH  ?? "--";
  const wind = first.WSD  ?? "--";
  const rain = first.POP  ?? "--";

  document.getElementById("summary-icon").textContent   = getWeatherIcon(sky, pty);
  document.getElementById("summary-temp").textContent   = `${temp}°C`;
  document.getElementById("summary-desc").textContent   = getWeatherText(sky, pty);
  document.getElementById("summary-region").textContent = REGION_NAMES[regionKey] ?? regionKey;
  document.getElementById("detail-humidity").textContent = `${hum}%`;
  document.getElementById("detail-wind").textContent    = `${wind} m/s`;
  document.getElementById("detail-rain").textContent    = `${rain}%`;

  document.getElementById("summary-section").style.display = "block";
}

function renderForecast(rows) {
  const grid = document.getElementById("forecast-grid");
  grid.innerHTML = "";
  // 최대 24개 표시
  rows.slice(0, 24).forEach((row, i) => {
    const sky  = row.SKY || "1";
    const pty  = row.PTY || "0";
    const temp = row.TMP ?? "--";
    const rain = row.POP ?? "--";

    const card = document.createElement("div");
    card.className = "forecast-card";
    card.style.animationDelay = `${i * 0.04}s`;
    card.innerHTML = `
      <div class="fc-time">${fmtDate(row.date)} ${fmtTime(row.time)}</div>
      <div class="fc-icon">${getWeatherIcon(sky, pty)}</div>
      <div class="fc-temp">${temp}°C</div>
      <div class="fc-sky">${getWeatherText(sky, pty)}</div>
      <div class="fc-rain">🌂 ${rain}%</div>
    `;
    grid.appendChild(card);
  });
  document.getElementById("forecast-section").style.display = "block";
}

// 메인 이벤트
document.getElementById("fetch-btn").addEventListener("click", async () => {
  const select = document.getElementById("region-select");
  const [nx, ny] = select.value.split(",");
  const regionKey = select.value;

  // 초기화
  document.getElementById("summary-section").style.display  = "none";
  document.getElementById("forecast-section").style.display = "none";
  document.getElementById("error-msg").style.display        = "none";
  document.getElementById("loading").style.display          = "block";

  try {
    const items = await fetchForecast(nx, ny);
    const rows  = parseItems(items);

    if (rows.length === 0) throw new Error("예보 데이터가 없습니다.");

    renderSummary(rows[0], regionKey);
    renderForecast(rows);
  } catch (err) {
    const errEl = document.getElementById("error-msg");
    errEl.textContent = `⚠️ 데이터를 불러오지 못했습니다: ${err.message}`;
    errEl.style.display = "block";
    console.error(err);
  } finally {
    document.getElementById("loading").style.display = "none";
  }
});

// 페이지 로드 시 자동 조회
window.addEventListener("load", () => {
  document.getElementById("fetch-btn").click();
});
