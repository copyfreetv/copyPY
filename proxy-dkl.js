// 1. กำหนด URL ของ Worker หรือ Proxy Server ที่คุณสร้างขึ้น
const PROXY_BASE = "https://doofree.playidlive.workers.dev/proxy";

// 2. กำหนด Key (ถ้ามี) เพื่อความปลอดภัย ไม่ให้คนอื่นแอบใช้ Proxy ของเรา
const PROXY_KEY  = "2026"; 

/**
 * ฟังก์ชันสำหรับแปลง URL ปกติให้วิ่งผ่าน Proxy
 * @param {string} targetUrl - URL ต้นทางที่ต้องการดึงข้อมูล (เช่น m3u8 หรือ API)
 */
function useProxy(targetUrl) {
    if (!targetUrl) return "";
    // ใช้ encodeURIComponent เพื่อป้องกันปัญหาอักขระพิเศษใน URL
    return `${PROXY_BASE}?key=${PROXY_KEY}&url=${encodeURIComponent(targetUrl)}`;
}

// ตัวอย่างการใช้งาน
const originalUrl = "https://api.example.com/data.json";
const proxiedUrl = useProxy(originalUrl);

console.log(proxiedUrl); 
// ผลลัพธ์: https://ชื่อโปรเจกต์ของคุณ.workers.dev/proxy?key=รหัสลับของคุณ_2026&url=https%3A%2F%2Fapi.example.com%2Fdata.json
