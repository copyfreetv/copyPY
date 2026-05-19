export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) {
    return res.status(400).send("Missing url parameter");
  }

  try {
    const response = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Referer": "https://dooballktv.net/",
        "Origin": "https://dooballktv.net"
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch: ${response.statusText}`);
    }

    const data = await response.text();

    // ตั้งค่า Header ให้ถูกต้องสำหรับ HLS ดูได้ลื่นๆ
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl"); 
    res.setHeader("Cache-Control", "no-cache");

    return res.status(200).send(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
