from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, PlainTextResponse, HTMLResponse
import httpx
from urllib.parse import urljoin, urlparse, quote
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🌐 สั่งให้ดึงหน้าแรกจาก public/index.html มาโชว์อัตโนมัติ
@app.get("/", response_class=HTMLResponse)
async def read_index():
    index_path = os.path.join(os.getcwd(), "public", "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>พบบัญชีระบบ แต่ไม่พบไฟล์ public/index.html</h1>"

@app.get("/api/proxy")
async def movie_proxy_engine(
    request: Request,
    url: str = Query(..., description="ลิงก์ไฟล์ .m3u8 จริง"),
    referer: str = Query(None, description="เว็บต้นทางเอาไว้หลอกระบบบล็อก")
):
    base_proxy_url = f"{request.url.scheme}://{request.url.netloc}/api/proxy"
    parsed_target = urlparse(url)
    
    target_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Host": parsed_target.netloc
    }
    if referer:
        target_headers["Referer"] = referer

    try:
        async with httpx.AsyncClient(follow_redirects=True, headers=target_headers, timeout=15.0) as client:
            response = await client.get(url)
            if response.status_code != 200:
                return PlainTextResponse(f"Error: {response.status_code}", status_code=response.status_code)

            if "application/vnd.apple.mpegurl" in response.headers.get("content-type", "") or url.endswith(".m3u8") or "#EXTM3U" in response.text:
                lines = response.text.splitlines()
                modified_lines = []
                for line in lines:
                    line = line.strip()
                    if not line: continue
                    if line.startswith("#"):
                        modified_lines.append(line)
                    else:
                        absolute_segment_url = urljoin(url, line)
                        proxied_segment = f"{base_proxy_url}?url={quote(absolute_segment_url)}"
                        if referer:
                            proxied_segment += f"&referer={quote(referer)}"
                        modified_lines.append(proxied_segment)
                return PlainTextResponse("\n".join(modified_lines), media_type="application/vnd.apple.mpegurl")
            else:
                async def stream_video_file():
                    async with client.stream("GET", url) as video_res:
                        async for chunk in video_res.aiter_bytes(chunk_size=1024 * 32):
                            yield chunk
                return StreamingResponse(stream_video_file(), media_type="video/mp2t")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
