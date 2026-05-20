// api/proxy.js
export default async function handler(req, res) {
  const target = req.query.url;
  
  if (!target) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  // ป้องกันการยิง Proxy มั่วซั่ว
  if (!target.includes("24-hds.com")) {
    return res.status(403).json({ error: "Unauthorized target" });
  }

  try {
    const response = await fetch(target, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.24-hds.com/",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Target responded with ${response.status}` });
    }

    const contentType = response.headers.get("content-type");
    const data = await response.arrayBuffer(); // ใช้ arrayBuffer เพื่อความชัวร์เรื่อง Encoding

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType || "text/html; charset=utf-8");
    res.status(200).send(Buffer.from(data));
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
