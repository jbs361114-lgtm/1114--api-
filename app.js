// 지도 초기화
const map = L.map('map').setView([35.82422, 127.14795], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

async function loadData() {
    const authKey = "599f4697dbbe04db4184154f9f82144d0bd5b5c234f1f489e057dff5ce68f300";
    const targetUrl = `https://openapi.jeonju.go.kr/rest/recyclingbin/getRecyclingbinList?authKey=${authKey}&pageNo=1&numOfRows=100`;
    
    // CORS 보안 우회 프록시
    const proxyUrl = "https://api.allorigins.win/get?url=" + encodeURIComponent(targetUrl);

    try {
        const response = await fetch(proxyUrl);
        const json = await response.json();
        const xmlDoc = new DOMParser().parseFromString(json.contents, "text/xml");
        
        let items = xmlDoc.getElementsByTagName("list");
        if (items.length === 0) items = xmlDoc.getElementsByTagName("item");

        if (items.length > 0) {
            Array.from(items).forEach(item => {
                const lat = parseFloat(item.getElementsByTagName("posy")[0]?.textContent);
                const lng = parseFloat(item.getElementsByTagName("posx")[0]?.textContent);
                const addr = item.getElementsByTagName("address")[0]?.textContent || "전주시";
                const type = item.getElementsByTagName("crate")[0]?.textContent || "분리수거함";

                if(!isNaN(lat) && !isNaN(lng)) {
                    L.marker([lat, lng]).addTo(map).bindPopup(`<b>${type}</b><br>${addr}`);
                }
            });
            document.getElementById('status').style.display = 'none';
        } else { throw new Error("No data"); }
    } catch (e) {
        document.getElementById('status').innerText = "연결 지연으로 샘플 데이터를 표시합니다.";
        // 서버 연결 실패 시 예시 데이터
        const samples = [
            {p:[35.8242, 127.1479], t:"전주시청 인근"},
            {p:[35.8465, 127.1288], t:"전북대학교 인근"},
            {p:[35.8145, 127.1526], t:"한옥마을 인근"}
        ];
        samples.forEach(s => L.marker(s.p).addTo(map).bindPopup(s.t));
        setTimeout(() => document.getElementById('status').style.display = 'none', 3000);
    }
}

window.onload = loadData;