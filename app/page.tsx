"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Copy, 
  Check, 
  Terminal, 
  Layers, 
  Film, 
  Tv, 
  ExternalLink,
  Search,
  Sliders,
  FolderOpen,
  X,
  Plus,
  HelpCircle,
  Clock,
  Settings,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

// TypeScript interfaces
interface Episode {
  title: string;
  url: string;
}

interface SeriesData {
  id: string;
  title: string;
  poster: string;
  episodes: Episode[];
  pageNum: number;
  synopsis?: string;
}

interface ScraperLog {
  timestamp: string;
  message: string;
  type: "info" | "success" | "warn" | "error";
}

export default function SeriesHarvesterPage() {
  // Scraper controls
  // Active Harvester Tab Selection
  const [activeTab, setActiveTab] = useState<"kubhd24" | "123hdtv" | "doonang" | "ezmovie">("kubhd24");

  // Scraper controls (KubHD24)
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(2);
  const [delayMs, setDelayMs] = useState<number>(1000); // 1s default cooldown to avoid rate limit
  const [clearPrevious, setClearPrevious] = useState<boolean>(true);

  // 123HDTV Scraper states & inputs
  const [postId123, setPostId123] = useState<number>(181920);
  const [nonce123, setNonce123] = useState<string>("f597124a37");
  const [totalEpisodes123, setTotalEpisodes123] = useState<number>(6);
  const [title123, setTitle123] = useState<string>("A Knight of the Seven Kingdoms");
  const [slug123, setSlug123] = useState<string>("a-lover-in-the-mortal-world");
  const [poster123, setPoster123] = useState<string>("https://parser-xi.vercel.app/wp-content/uploads/2026/01/A-Knight-of-the-Seven-Kingdoms-2026-300x450.jpg");
  const [synopsis123, setSynopsis123] = useState<string>("Genres: ซีรี่ย์ซับไทย, ซีรี่ย์ใหม่ 2026, ซีรี่ย์พากย์ไทย, ซีรี่ย์ฝรั่ง, Action บู๊, Drama ชีวิต, Fantasy แฟนตาซี");
  const [seriesList123, setSeriesList123] = useState<SeriesData[]>([]);

  // DooNang Scraper states & inputs
  const [pageDoonang, setPageDoonang] = useState<number>(1);
  const [limitDoonang, setLimitDoonang] = useState<number>(24);
  const [seriesListDoonang, setSeriesListDoonang] = useState<SeriesData[]>([]);

  // EzMovie Scraper states & inputs
  const [ezCategory, setEzCategory] = useState<string>("/movies/หนังมาใหม่");
  const [ezStartPage, setEzStartPage] = useState<number>(1);
  const [ezEndPage, setEzEndPage] = useState<number>(2);
  const [seriesListEz, setSeriesListEz] = useState<SeriesData[]>([]);

  // Scraper runtime states
  const [isHarvesting, setIsHarvesting] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentProgress, setCurrentProgress] = useState<{
    page: number;
    seriesIndex: number;
    totalSeriesInPage: number;
    currentSeriesName: string;
  }>({
    page: 1,
    seriesIndex: 0,
    totalSeriesInPage: 0,
    currentSeriesName: "",
  });

  const [seriesList, setSeriesList] = useState<SeriesData[]>([]);
  const [logs, setLogs] = useState<ScraperLog[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<SeriesData | null>(null);

  const handleSelectSeries = (series: SeriesData | null) => {
    setActiveEpisode(null);
    setSelectedSeries(series);
  };
  
  // Settings panel toggle
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Target categories & paths
  const [categoryType, setCategoryType] = useState<string>("https://kubhd24.net/category/watch-series/");
  const [categoryUrl, setCategoryUrl] = useState<string>("https://kubhd24.net/category/watch-series/");

  // Active episode chosen for the player
  const [activeEpisode, setActiveEpisode] = useState<{ title: string; url: string; index: number } | null>(null);

  // Player refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);

  // Clean up and load player on activeEpisode change
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeEpisode) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = activeEpisode.url;

    import("hls.js").then((M) => {
      const HlsClass = M.default;
      if (HlsClass.isSupported()) {
        const hls = new HlsClass({
          maxMaxBufferLength: 10,
          enableWorker: true,
          lowLatencyMode: true
        });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
          video.play().catch((err) => console.log("Autoplay blocked:", err));
        });
        hls.on(HlsClass.Events.ERROR, (event: any, data: any) => {
          if (data.fatal) {
            switch (data.type) {
              case HlsClass.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case HlsClass.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
        video.addEventListener("loadedmetadata", () => {
          video.play().catch((err) => console.log("Autoplay blocked:", err));
        });
      }
    }).catch(err => {
      console.error("Hls load error:", err);
    });

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeEpisode]);

  // Safe reference flags to handle pausing and stopping asynchronously
  const isHarvestingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const shouldStopRef = useRef<boolean>(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Sync state with refs to allow thread-safe reading during long async loops
  useEffect(() => {
    isHarvestingRef.current = isHarvesting;
    isPausedRef.current = isPaused;
  }, [isHarvesting, isPaused]);

  // Keep terminal scrolled to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Helper: append real-time log
  const addLog = (message: string, type: "info" | "success" | "warn" | "error" = "info") => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString("th-TH", { hour12: false });
    setLogs((prev) => [...prev, { timestamp, message, type }]);
  };

  // Helper: Sleep function that respects pause & stop
  const waitState = async (ms: number) => {
    const startTime = Date.now();
    while (Date.now() - startTime < ms) {
      if (shouldStopRef.current) break;
      // Loop with small intervals if paused
      if (isPausedRef.current) {
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  };

  // Core Request Helper to bypass CORS
  const fetchProxy = async (url: string, isJson = false) => {
    try {
      const proxyUrl = `/api/proxy-k24hd?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) {
        addLog(`เซิร์ฟเวอร์ตอบกลับสถานะล้มเหลว: ${res.status} สำหรับ URL: ${url}`, "error");
        return null;
      }
      return isJson ? await res.json() : await res.text();
    } catch (e: any) {
      addLog(`เกิดข้อผิดพลาดในการเชื่อมต่อผ่าน Proxy: ${e.message || e}`, "error");
      return null;
    }
  };

  // Resolve direct stream playlist file from post_id
  const getStreamUrl = async (postId: string, titleHint: string): Promise<string | null> => {
    const endpoint = `https://kubhd24.net/wp-admin/admin-ajax.php?action=mix_get_player&post_id=${postId}`;
    const json = await fetchProxy(endpoint, true);
    if (!json || !json.success) {
      addLog(`[${titleHint}] ไม่มีข้อมูลผู้เล่นแบบอะซิงก์หรือล้มเหลว`, "warn");
      return null;
    }

    const playerHtml = json.player || "";
    const match = playerHtml.match(/data-src=["']([^"']+)["']/);
    if (!match) {
      addLog(`[${titleHint}] ค้นหารูปแบบวิดีโอ (data-src) ไม่พบ`, "warn");
      return null;
    }

    const srcUrl = match[1];
    // Resolve clean ID
    const segments = srcUrl.split("/").filter(Boolean);
    const id = segments.length > 0 ? segments[segments.length - 1] : "";

    if (id) {
      return `https://media.vdohls.com/${id}/playlist.m3u8`;
    }
    return null;
  };

  // Scrape single series page detail (KubHD24)
  const parseSeriesDetail = async (seriesId: string, pageNum: number): Promise<SeriesData | null> => {
    const url = `https://kubhd24.net/series/${seriesId}/`;
    const html = await fetchProxy(url);
    if (!html) {
      addLog(`ไม่สามารถโหลดหน้าซีรีย์: ${seriesId}`, "error");
      return null;
    }

    // Process using client-side DOM Parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const title = doc.querySelector("h1")?.textContent?.trim() || seriesId;
    
    // Find poster image
    const imgEl = doc.querySelector("img.wp-post-image") || doc.querySelector(".poster img") || doc.querySelector("img");
    let poster = imgEl?.getAttribute("data-src") || imgEl?.getAttribute("src") || "";
    
    // Fallback logic
    if (poster && poster.startsWith("//")) {
      poster = "https:" + poster;
    }
    if (!poster) {
      poster = `https://picsum.photos/seed/${seriesId}/300/440`;
    }

    // Find episodes buttons
    const epButtons = doc.querySelectorAll("#eplist button.ep");
    if (epButtons.length === 0) {
      addLog(`[${title}] ไม่พบปุ่มอีพีใดๆ ในหน้านี้`, "warn");
      return null;
    }

    addLog(`[${title}] พบทั้งหมด ${epButtons.length} ตอน กำลังประมวลผลลิงก์สตรีมมิ่ง...`, "info");
    
    const episodes: Episode[] = [];
    for (let i = 0; i < epButtons.length; i++) {
      if (shouldStopRef.current) break;
      
      const btn = epButtons[i];
      const epTitle = btn.textContent?.trim() || `ตอนที่ ${i + 1}`;
      const postId = btn.id;

      if (!postId) continue;

      // Small delay per stream call to avoid hammer limits
      await waitState(200);

      const url = await getStreamUrl(postId, `${title} - ${epTitle}`);
      if (url) {
        episodes.push({ title: epTitle, url });
      }
    }

    return {
      id: seriesId,
      title,
      poster,
      episodes,
      pageNum
    };
  };

  // Main scraper orchestrator (KubHD24)
  const startHarvesting = async () => {
    if (isHarvesting) return;

    // Reset cancellation/stop trigger
    shouldStopRef.current = false;
    setIsHarvesting(true);
    setIsPaused(false);

    if (clearPrevious) {
      setSeriesList([]);
      setLogs([]);
    }

    addLog(`🚀 เริ่มดึงข้อมูลจากหน้า ${startPage} ถึง ${endPage}... (หน่วงเวลา: ${delayMs}ms)`, "success");

    let totalSeriesFound = 0;
    const baseCategoryUrl = categoryUrl.endsWith("/") ? categoryUrl : `${categoryUrl}/`;

    for (let p = startPage; p <= endPage; p++) {
      if (shouldStopRef.current) break;

      const pageUrl = p === 1 ? baseCategoryUrl : `${baseCategoryUrl}page/${p}/`;
      addLog(`🔍 กำลังแสกนหน้าสารบัญที่ ${p}... [URL: ${pageUrl}]`, "info");

      setCurrentProgress((prev) => ({
        ...prev,
        page: p,
        seriesIndex: 0,
        totalSeriesInPage: 0,
        currentSeriesName: "กำลังสแกนรายชื่อซีรีย์...",
      }));

      const catHtml = await fetchProxy(pageUrl);
      if (!catHtml) {
        addLog(`⚠️ ไม่สามารถดึงหน้าสารบัญที่ ${p} ได้ ข้ามเนื้อหานี้`, "error");
        continue;
      }

      // Regex matching to parse all series slugs
      const regex = /href="https:\/\/kubhd24\.net\/series\/([^"\/]+)\//g;
      const parsedIds = Array.from(new Set([...catHtml.matchAll(regex)].map((m) => m[1])))
        .filter((id) => id !== "series");

      if (parsedIds.length === 0) {
        addLog(`⚠️ ไม่พบซีรีย์ใดๆ ในหน้าสารบัญที่ ${p}`, "warn");
        continue;
      }

      addLog(`พบซีรีย์จำนวน ${parsedIds.length} เรื่อง ในหน้า ${p}`, "success");
      
      setCurrentProgress((prev) => ({
        ...prev,
        totalSeriesInPage: parsedIds.length,
      }));

      for (let i = 0; i < parsedIds.length; i++) {
        if (shouldStopRef.current) break;

        const seriesId = parsedIds[i];
        setCurrentProgress((prev) => ({
          ...prev,
          seriesIndex: i + 1,
          currentSeriesName: seriesId,
        }));

        addLog(`[${i + 1}/${parsedIds.length}] ขอดึงข้อมูลเรื่อง: '${seriesId}'...`, "info");

        const data = await parseSeriesDetail(seriesId, p);
        
        if (data && data.episodes.length > 0) {
          setSeriesList((prev) => {
            // Avoid duplicate series ids
            const filtered = prev.filter((item) => item.id !== data.id);
            return [...filtered, data];
          });
          totalSeriesFound++;
          addLog(`✅ บันทึกซีรีย์สำเร็จ: '${data.title}' มี ${data.episodes.length} ตอน`, "success");
        } else {
          addLog(`❌ ดึงข้อมูลสำหรับซีรีย์ล้มเหลว หรือไม่พบตอนย่อย: '${seriesId}'`, "warn");
        }

        // Custom timeout interval after single complete series load to prevent blacklisting
        if (i < parsedIds.length - 1) {
          addLog(`💤 ระงับระบบรอคอยตามค่าดีเลย์ซีรีย์: ${delayMs}ms`, "info");
          await waitState(delayMs);
        }
      }
    }

    setIsHarvesting(false);
    
    if (shouldStopRef.current) {
      addLog(`🛑 บังคับหยุดการทำงานโดยผู้ใช้แล้ว ข้อมูลที่ดึงได้สำเร็จยังคงถูกรักษาไว้`, "warn");
    } else {
      addLog(`🎉 เสร็จสิ้นภารกิจ! รวบรวมสำเร็จทั้งสิ้น [ ${totalSeriesFound} ] เรื่อง จากหน้า ${startPage}-${endPage}`, "success");
    }
  };

  // 123HDTV Fetcher
  const getM3U8From123HD = async (postId: number, episode: number, nonce: string): Promise<string | null> => {
    const apiUrl = `https://www.123hdtv.com/wp-content/themes/halimmovies_54/halim-ajax.php?action=halim_ajax_player&nonce=${nonce}&episode=${episode}&server=1&postid=${postId}`;
    
    try {
      const proxyUrl = `/api/123hd?url=${encodeURIComponent(apiUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) {
        addLog(`[EP ${episode}] ไม่สามารถเข้าถึงเครื่องเล่น AJAX API ได้`, "warn");
        return null;
      }
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const iframe = doc.querySelector("iframe");
      if (!iframe) {
        addLog(`[EP ${episode}] ไม่พบ <iframe> เครื่องเล่นในผลพารามเตอรส์`, "warn");
        return null;
      }
      const embedUrl = iframe.src;
      const urlObject = new URL(embedUrl);
      const id = urlObject.searchParams.get("id");
      if (!id) {
        addLog(`[EP ${episode}] ไม่พบพารามิเตอร์รหัสวิดีโอ (id) ในแหล่งเล่น`, "warn");
        return null;
      }
      return `https://main.24playerhd.com/newplaylist/${id}/${id}.m3u8`;
    } catch (e: any) {
      addLog(`[EP ${episode}] เกิดข้อผิดพลาดทางเทคนิค: ${e.message || e}`, "error");
      return null;
    }
  };

  // 123HDTV Harvester Engine
  const startHarvesting123HD = async () => {
    if (isHarvesting) return;
    shouldStopRef.current = false;
    setIsHarvesting(true);
    setIsPaused(false);

    if (clearPrevious) {
      setSeriesList123([]);
      setLogs([]);
    }

    addLog(`🚀 เริ่มการขุดข้อมูล 123hdtv.com... (ID: ${postId123}, Nonce: ${nonce123}, ตอนทั้งหมด: ${totalEpisodes123})`, "success");

    const episodes: Episode[] = [];
    setCurrentProgress({
      page: 1,
      seriesIndex: 0,
      totalSeriesInPage: totalEpisodes123,
      currentSeriesName: title123,
    });

    for (let ep = 1; ep <= totalEpisodes123; ep++) {
      if (shouldStopRef.current) break;

      setCurrentProgress((prev) => ({
        ...prev,
        seriesIndex: ep,
      }));

      addLog(`⏳ กำลังสืบค้นและถอดรหัส ตอนที่ ${ep} ...`, "info");
      const m3u8 = await getM3U8From123HD(postId123, ep, nonce123);

      if (m3u8) {
        episodes.push({ 
          title: `ตอนที่ ${ep}`, 
          url: m3u8 
        });
        addLog(`✅ ถอดรหัสสำเร็จ ตอนที่ ${ep}: ${m3u8}`, "success");
      } else {
        addLog(`⚠️ ถอดรหัสตอนที่ ${ep} ล้มเหลวหรือไม่มีแหล่งที่เล่น`, "warn");
      }

      // Small cooldown delay
      if (ep < totalEpisodes123) {
        await waitState(delayMs);
      }
    }

    if (episodes.length > 0) {
      const parsedSeries: SeriesData = {
        id: slug123,
        title: title123,
        poster: poster123,
        synopsis: synopsis123,
        pageNum: 1,
        episodes
      };
      setSeriesList123([parsedSeries]);
    }

    setIsHarvesting(false);
    if (shouldStopRef.current) {
      addLog(`🛑 บังคับยกเลิกการดึงข้อมูล 123HDTV เรียบร้อยแล้ว`, "warn");
    } else {
      addLog(`🎉 เสร็จสิ้นภารกิจดึงข้อมูล 123HDTV! ได้รับมาพร้อมสตรีมมิ่งทั้งสิ้น [ ${episodes.length} ] ตอน`, "success");
    }
  };

  // DooNang Graphql Base Query Post Call
  const callDoonangGraphQL = async (query: string, variables: any) => {
    try {
      const res = await fetch("/api/doo-nang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables })
      });
      if (!res.ok) {
        addLog(`[DooNang API] เกิดข้อผิดพลาดส่งรหัสสถานะ: ${res.status}`, "error");
        return null;
      }
      return await res.json();
    } catch (e: any) {
      addLog(`[DooNang API] การเชื่อมต่อผ่าน API เครือข่ายล้มเหลว: ${e.message || e}`, "error");
      return null;
    }
  };

  // DooNang GraphQL Movies/Series Scraper Engine
  const startHarvestingDoonang = async () => {
    if (isHarvesting) return;
    shouldStopRef.current = false;
    setIsHarvesting(true);
    setIsPaused(false);

    if (clearPrevious) {
      setSeriesListDoonang([]);
      setLogs([]);
    }

    addLog(`🚀 เริ่มดึงข้อมูล Netflix Series จาก doo-nang.com [Page ${pageDoonang}] ผ่านเซิร์ฟเวอร์แบบ GraphQL...`, "success");

    const limit = limitDoonang;
    const offset = (pageDoonang - 1) * limit;

    const listQuery = `
      query getShows($limit: Int, $offset: Int, $type: String, $value: String) {
        shows(limit: $limit, offset: $offset, type: $type, value: $value) {
          items { id titleTh titleEn posterUrl }
        }
      }
    `;

    addLog(`⌛ ส่งคิวรีดึงรายชื่อซีรีย์ Netflix ของเพจที่เขียน...`, "info");
    const listRes = await callDoonangGraphQL(listQuery, { limit, offset, type: "serie-tag", value: "netflix" });
    const items = listRes?.data?.shows?.items || [];

    if (items.length === 0) {
      addLog(`⚠️ ไม่พบคลังข้อมูลรายการ Netflix ในหน้านี้ หรือ API มีการปิดกั้น Origin`, "error");
      setIsHarvesting(false);
      return;
    }

    addLog(`✅ ดึงรายชื่อสำเร็จ พบทั้งหมด ${items.length} เรื่อง! ดำเนินการวิเคราะห์ตอนย่อยลิงค์ .m3u8 ทีละเรื่อง...`, "success");

    setCurrentProgress({
      page: pageDoonang,
      seriesIndex: 0,
      totalSeriesInPage: items.length,
      currentSeriesName: "กำลังจัดเตรียมคิว...",
    });

    const detailQuery = `
      query getShow($id: Int!) {
        show(id: $id) {
          id titleTh titleEn posterUrl
          episodes {
            seasonNo episodeNo titleTh
            video { transcodeUuid }
          }
        }
      }
    `;

    let activeParsed = 0;

    for (let i = 0; i < items.length; i++) {
      if (shouldStopRef.current) break;

      const item = items[i];
      const title = item.titleTh || item.titleEn || `Series #${item.id}`;
      
      setCurrentProgress((prev) => ({
        ...prev,
        seriesIndex: i + 1,
        currentSeriesName: title,
      }));

      addLog(`[${i + 1}/${items.length}] 📬 ร้องขอดีเทลซีรีย์: '${title}'`, "info");

      const detailRes = await callDoonangGraphQL(detailQuery, { id: parseInt(item.id) });
      const show = detailRes?.data?.show;

      if (show) {
        const episodes: Episode[] = [];
        const rawEps = show.episodes || [];

        rawEps.forEach((ep: any) => {
          if (ep.video && ep.video.transcodeUuid) {
            const m3u8Url = `https://api.doo-nang.com/video/${ep.video.transcodeUuid}/playlist.m3u8`;
            const s = String(ep.seasonNo || 1).padStart(2, "0");
            const e = String(ep.episodeNo).padStart(2, "0");
            episodes.push({
              title: `S${s}E${e} - ${ep.titleTh || `ตอนที่ ${ep.episodeNo}`}`,
              url: m3u8Url
            });
          }
        });

        if (episodes.length > 0) {
          const finishedCard: SeriesData = {
            id: String(show.id),
            title: show.titleTh || show.titleEn || `Series ${show.id}`,
            poster: show.posterUrl || "https://picsum.photos/seed/doonang/300/450",
            pageNum: pageDoonang,
            episodes,
            synopsis: `Title En: ${show.titleEn || "N/A"} | Tags: Netflix Series / Doo-Nang GraphQL Engine`
          };

          setSeriesListDoonang((prev) => {
            const filtered = prev.filter((it) => it.id !== finishedCard.id);
            return [...filtered, finishedCard];
          });
          activeParsed++;
          addLog(`✅ บันทึกซีรีย์สำเร็จ: '${finishedCard.title}' มี ${episodes.length} ตอน`, "success");
        } else {
          addLog(`⚠️ ข้ามเรื่อง '${title}' เนื่องจากไม่พบ transcode_uuid ในระบบเซิร์ฟเวอร์`, "warn");
        }
      }

      if (i < items.length - 1) {
        await waitState(delayMs);
      }
    }

    setIsHarvesting(false);
    if (shouldStopRef.current) {
      addLog(`🛑 สั่งระงับกระบวนการดึงข้อมูล Doo-Nang ซีรีย์ที่ดึงได้สำเร็จยังคงถูกแสดงผลบนหน้าจอ`, "warn");
    } else {
      addLog(`🎉 เสร็จสิ้นการจัดทำสารบัญ Doo-Nang! ถอนรหัสสตรีมมิ่งสำเร็จทั้งหมด [ ${activeParsed} / ${items.length} ] เรื่อง`, "success");
    }
  };

  // EzMovie Helpers & Harvester
  const fetchEzProxy = async (url: string) => {
    try {
      const proxyUrl = `/api/ezmovie?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) {
        addLog(`[EzMovie Proxy] ไม่สามารถโหลดได้: ${res.status} สำหรับ URL: ${url}`, "error");
        return null;
      }
      return await res.text();
    } catch (e: any) {
      addLog(`[EzMovie Proxy] เกิดข้อผิดพลาดเชื่อมต่อ: ${e.message || e}`, "error");
      return null;
    }
  };

  const parseEzMovieList = async (categoryPath: string, pageNum: number) => {
    const url = `https://ezmovie.movie${categoryPath}?page=${pageNum}`;
    addLog(`⏳ กำลังสืบค้นรายการจากหน้า ${pageNum}: ${url}`, "info");

    const html = await fetchEzProxy(url);
    if (!html) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const movies: { title: string; image: string; movieUrl: string }[] = [];

    const aElements = doc.querySelectorAll("a[data-url]");
    aElements.forEach((el) => {
      const title = el.querySelector("h2.-title")?.textContent?.trim() || el.textContent?.trim() || "หนังนิรนาม";

      let image = el.querySelector("img")?.getAttribute("data-src") || el.querySelector("img")?.getAttribute("src") || "";
      if (image && image.startsWith("data:")) {
        image = el.querySelector("source")?.getAttribute("srcset") || "";
      }

      const ajaxPath = el.getAttribute("data-url") || "";
      if (ajaxPath) {
        const movieUrl = "https://ezmovie.movie" + ajaxPath.replace("/_ajax/movie/", "/movie/");
        movies.push({ title, image, movieUrl });
      }
    });

    return movies;
  };

  const extractFromPlayer = async (playerUrl: string): Promise<Episode[]> => {
    const html = await fetchEzProxy(playerUrl);
    if (!html) return [];

    const matches = html.match(/https?:\/\/[^"' ]+\.m3u8[^"' ]*/g);
    if (!matches) return [];

    const episodes: Episode[] = [];
    const uniqueUrls = new Set<string>();

    matches.forEach((m) => {
      const mUri = m.trim();
      const lower = mUri.toLowerCase();
      if (lower.includes("intro") || lower.includes("ads")) return;
      if (uniqueUrls.has(mUri)) return;

      uniqueUrls.add(mUri);
      episodes.push({
        title: `M3U8 Stream - เซิร์ฟเวอร์ ${episodes.length + 1}`,
        url: mUri
      });
    });

    return episodes;
  };

  const getMoviePage = async (movieUrl: string): Promise<Episode[]> => {
    const html = await fetchEzProxy(movieUrl);
    if (!html) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const iframes = doc.querySelectorAll("iframe");

    let servers: Episode[] = [];
    
    for (let i = 0; i < iframes.length; i++) {
      const src = iframes[i].getAttribute("src");
      if (!src || src.includes("youtube") || src.includes("google.com/recaptcha")) continue;

      let absoluteSrc = src;
      if (src.startsWith("//")) {
        absoluteSrc = "https:" + src;
      } else if (src.startsWith("/")) {
        absoluteSrc = "https://ezmovie.movie" + src;
      }

      addLog(`🕵️ วิเคราะห์แฝงตัวเล่นไฟล์: ${absoluteSrc.substring(0, 80)}...`, "info");
      const innerServers = await extractFromPlayer(absoluteSrc);
      servers = servers.concat(innerServers);
    }

    return servers;
  };

  const startHarvestingEzMovie = async () => {
    if (isHarvesting) return;
    shouldStopRef.current = false;
    setIsHarvesting(true);
    setIsPaused(false);

    if (clearPrevious) {
      setSeriesListEz([]);
      setLogs([]);
    }

    addLog(`🚀 เริ่มดึงข้อมูล EzMovie... [หน้า ${ezStartPage} - ${ezEndPage}] [หมวด: ${ezCategory}]`, "success");

    let totalSaved = 0;

    for (let p = ezStartPage; p <= ezEndPage; p++) {
      if (shouldStopRef.current) break;

      addLog(`📂 เข้าถึงข้อมูลหน้า ${p}...`, "info");
      const movies = await parseEzMovieList(ezCategory, p);

      if (movies.length === 0) {
        addLog(`🛑 ไม่พบหนังว่างในหน้า ${p} → จบการทำงานในสารบัญนี้`, "warn");
        break;
      }

      addLog(`✅ พบทั้งหมด ${movies.length} เรื่อง ในหน้า ${p}! ระบบกำลังประมวลช่องสตรีมมิ่ง...`, "success");

      setCurrentProgress({
        page: p,
        seriesIndex: 0,
        totalSeriesInPage: movies.length,
        currentSeriesName: "เตรียมคิว...",
      });

      for (let i = 0; i < movies.length; i++) {
        if (shouldStopRef.current) break;

        const movie = movies[i];
        
        setCurrentProgress((prev) => ({
          ...prev,
          seriesIndex: i + 1,
          currentSeriesName: movie.title,
        }));

        addLog(`[${i + 1}/${movies.length}] 🎥 ดึงข้อมูลหนัง: '${movie.title}' ...`, "info");

        const servers = await getMoviePage(movie.movieUrl);

        if (servers && servers.length > 0) {
          const slug = movie.movieUrl.split("/").pop() || String(Date.now());
          const finishedMovie: SeriesData = {
            id: slug,
            title: movie.title,
            poster: movie.image || "https://picsum.photos/seed/ezmovie/300/450",
            pageNum: p,
            episodes: servers,
            synopsis: `หมวดหมู่: ${ezCategory} | ลิงก์ตรง: ${movie.movieUrl}`
          };

          setSeriesListEz((prev) => {
            const filtered = prev.filter((it) => it.id !== finishedMovie.id);
            return [...filtered, finishedMovie];
          });
          totalSaved++;
          addLog(`✅ ถอดรหัสสำเร็จ: '${finishedMovie.title}' (${finishedMovie.episodes.length} stream sources)`, "success");
        } else {
          addLog(`⚠️ ข้ามเรื่อง '${movie.title}' เนื่องจากไม่พบช่อง m3u8`, "warn");
        }

        if (i < movies.length - 1) {
          await waitState(delayMs);
        }
      }
    }

    setIsHarvesting(false);
    if (shouldStopRef.current) {
      addLog(`🛑 ยกเลิกภารกิจขุด EzMovie กลางทางเรียบร้อยแล้ว`, "warn");
    } else {
      addLog(`🎉 สารบัญ EzMovie เสร็จสิ้นเรียบร้อย! ค้นพบและเชื่อมได้ทั้งหมด ${totalSaved} เรื่อง`, "success");
    }
  };

  // Unified trigger based on activeTab
  const handleExecuteActiveHarvester = () => {
    if (activeTab === "kubhd24") {
      startHarvesting();
    } else if (activeTab === "123hdtv") {
      startHarvesting123HD();
    } else if (activeTab === "ezmovie") {
      startHarvestingEzMovie();
    } else {
      startHarvestingDoonang();
    }
  };

  // Toggle pause trigger gracefully
  const togglePause = () => {
    setIsPaused((prev) => {
      const targetState = !prev;
      addLog(targetState ? "⏸️ หยุดพักสคริปต์การขุดข้อมูลชั่วคราว..." : "▶️ ทำงานต่อจากความเร่งรีบ...", "warn");
      return targetState;
    });
  };

  // Graceful stopping
  const stopHarvesting = () => {
    shouldStopRef.current = true;
    setIsPaused(false);
    setIsHarvesting(false);
    addLog("🛑 ทำการส่งคำขอยกเลิกแบบปลอดภัย รอเซกเมนต์ปัจจุบันคืนค่า...", "error");
  };

  // Clear logs terminal block
  const clearLogs = () => {
    setLogs([]);
    addLog("🧹 เคลียร์บอร์ดสเตตัสคอนโซลเรียบร้อย", "info");
  };

  // Helper arrays for different active tabs
  const activeSeriesList = useMemo(() => {
    if (activeTab === "kubhd24") return seriesList;
    if (activeTab === "123hdtv") return seriesList123;
    if (activeTab === "ezmovie") return seriesListEz;
    return seriesListDoonang;
  }, [activeTab, seriesList, seriesList123, seriesListDoonang, seriesListEz]);

  // Generate full individual M3U playlist file content
  const generateM3UOfSeries = (item: SeriesData): string => {
    if (activeTab === "123hdtv") {
      let m3u = "#EXTM3U\n";
      const logo = item.poster || "";
      const title = item.title || "ซีรีส์";
      item.episodes.forEach((ep, idx) => {
        m3u += `#EXTINF:-1 tvg-logo="${logo}" tvg-season="1" tvg-episode="${idx + 1}", ${title} S01 EP${String(idx + 1).padStart(2, "0")}\n`;
        m3u += ep.url + "\n";
      });
      return m3u;
    }
    
    let m3u = "#EXTM3U\n";
    item.episodes.forEach((ep) => {
      m3u += `#EXTINF:-1 tvg-logo="${item.poster}" group-title="${item.title}", ${item.title} - ${ep.title}\n${ep.url}\n`;
    });
    return m3u;
  };

  // Generate 123HDTV JSON data
  const generateJSONOfSeries = (series: SeriesData): string => {
    const rawData = {
      id: series.id || "",
      name: series.title || "",
      category: "ซีรีส์",
      info: {
        poster: series.poster || "",
        description: series.synopsis || "",
        year: new Date().getFullYear()
      },
      seasons: [
        {
          season: 1,
          name: "Season 1",
          info: {
            poster: series.poster || "",
            description: series.synopsis || "",
            year: new Date().getFullYear()
          },
          episodes: series.episodes.map((ep, idx) => ({
            episode: idx + 1,
            name: ep.title,
            video: ep.url || "",
            subtitle: "",
            referrer: "https://www.123hdtv.com"
          }))
        }
      ]
    };
    return JSON.stringify([rawData], null, 2);
  };

  // Generate a singular single-click merge file of ALL harvested serials
  const generateMergedM3U = (): string => {
    let m3u = `#EXTM3U\n#PLAYLIST:รวมซีรีย์จากการดึงข้อมูลโฮสต์\n\n`;
    activeSeriesList.forEach((item) => {
      if (activeTab === "123hdtv") {
        m3u += generateM3UOfSeries(item) + "\n";
      } else {
        item.episodes.forEach((ep) => {
          m3u += `#EXTINF:-1 tvg-logo="${item.poster}" group-title="${item.title}", ${item.title} - ${ep.title}\n${ep.url}\n`;
        });
      }
    });
    return m3u;
  };

  // Trigger file download to local PC
  const downloadM3U = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addLog(`📥 ดาวน์โหลดคลังเพลลิตส์สำเร็จ: ${filename}`, "success");
  };

  // Handle single-line copies
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Derived filtered listing via keyword matching
  const filteredSeriesList = useMemo(() => {
    if (!searchQuery) return activeSeriesList;
    const query = searchQuery.toLowerCase().trim();
    return activeSeriesList.filter((item) => 
      item.title.toLowerCase().includes(query) || 
      item.id.toLowerCase().includes(query)
    );
  }, [activeSeriesList, searchQuery]);

  // Aggregate stats
  const aggregateStats = useMemo(() => {
    const totalEpisodes = activeSeriesList.reduce((acc, current) => acc + current.episodes.length, 0);
    return {
      seriesCount: activeSeriesList.length,
      episodeCount: totalEpisodes
    };
  }, [activeSeriesList]);

  return (
    <div className="min-h-screen bg-[#0A0C10] flex flex-col text-gray-300 font-sans">
      {/* Sleek GitHub/Technical Header style */}
      <header className="border-b border-[#2D333B] bg-[#11141B] py-3.5 px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <div className="w-9 h-9 bg-[#58A6FF] text-[#0A0C10] rounded flex items-center justify-center font-black text-lg select-none">
            K
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-wider uppercase text-gray-100 font-mono">K-Harvest Pro</h1>
              <span className="text-[10px] bg-[#1f242c] border border-[#2D333B] px-1.5 py-0.5 rounded text-[#58A6FF] font-mono">BY PLAID</span>
            </div>
            <p className="text-[10px] text-[#58A6FF] uppercase tracking-wider font-mono">Multi-Page API Harvester v4.2</p>
          </div>
        </div>

        {/* Real-time status indicators in header */}
        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-[#2D333B] pt-2 sm:pt-0">
          <div className="text-left sm:text-right font-mono">
            <div className="text-[10px] text-gray-500 uppercase">Proxy Connection</div>
            <div className="text-xs text-[#3FB950] font-medium flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-[#3FB950] animate-pulse" />
              <span>● STABLE / HTTPS</span>
            </div>
          </div>
          
          <div className="hidden md:block h-8 w-[1px] bg-[#2D333B]" />

          <div className="text-left sm:text-right font-mono">
            <div className="text-[10px] text-gray-500 uppercase">Active Engine</div>
            <div className="text-xs text-white uppercase mt-0.5 truncate max-w-[200px]">
              {activeTab === "kubhd24" ? "KUBHD24 SCRAPER" : activeTab === "123hdtv" ? "123HDTV AJAX" : activeTab === "ezmovie" ? "EZMOVIE SCRAPER" : "DOO-NANG GRAPHQL"}
            </div>
          </div>

          <div className="hidden sm:block h-8 w-[1px] bg-[#2D333B]" />

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#161B22] border border-[#2D333B] rounded text-[11px] text-amber-500 font-mono">
            <Clock size={11} className="text-amber-500" />
            <span>UTC 2026-05-26</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl flex-1 flex flex-col">

      {/* Dynamic Tab Switcher */}
      <div className="flex bg-[#11141B] border border-[#2D333B] p-1.5 rounded-lg mb-6 w-full max-w-2xl mx-auto gap-2">
        <button
          onClick={() => {
            if (!isHarvesting) {
              setActiveTab("kubhd24");
              handleSelectSeries(null);
            }
          }}
          disabled={isHarvesting}
          className={cn(
            "flex-1 py-2.5 rounded text-xs font-bold font-mono tracking-wider uppercase transition-all flex items-center justify-center gap-2 select-none cursor-pointer disabled:opacity-50",
            activeTab === "kubhd24" 
              ? "bg-[#58A6FF] text-[#0A0C10]" 
              : "text-gray-400 hover:text-white hover:bg-[#161B22]"
          )}
        >
          <Tv size={14} />
          <span>KUBHD24.NET</span>
        </button>

        <button
          onClick={() => {
            if (!isHarvesting) {
              setActiveTab("123hdtv");
              handleSelectSeries(null);
            }
          }}
          disabled={isHarvesting}
          className={cn(
            "flex-1 py-2.5 rounded text-xs font-bold font-mono tracking-wider uppercase transition-all flex items-center justify-center gap-2 select-none cursor-pointer disabled:opacity-50",
            activeTab === "123hdtv" 
              ? "bg-[#58A6FF] text-[#0A0C10]" 
              : "text-gray-400 hover:text-white hover:bg-[#161B22]"
          )}
        >
          <Layers size={14} />
          <span>123HDTV.COM</span>
        </button>

        <button
          onClick={() => {
            if (!isHarvesting) {
              setActiveTab("doonang");
              handleSelectSeries(null);
            }
          }}
          disabled={isHarvesting}
          className={cn(
            "flex-1 py-2.5 rounded text-xs font-bold font-mono tracking-wider uppercase transition-all flex items-center justify-center gap-2 select-none cursor-pointer disabled:opacity-50",
            activeTab === "doonang" 
              ? "bg-[#58A6FF] text-[#0A0C10]" 
              : "text-gray-400 hover:text-white hover:bg-[#161B22]"
          )}
        >
          <Film size={14} />
          <span>DOO-NANG (NETFLIX)</span>
        </button>

        <button
          onClick={() => {
            if (!isHarvesting) {
              setActiveTab("ezmovie");
              handleSelectSeries(null);
            }
          }}
          disabled={isHarvesting}
          className={cn(
            "flex-1 py-2.5 rounded text-xs font-bold font-mono tracking-wider uppercase transition-all flex items-center justify-center gap-2 select-none cursor-pointer disabled:opacity-50",
            activeTab === "ezmovie" 
              ? "bg-[#58A6FF] text-[#0A0C10]" 
              : "text-gray-400 hover:text-white hover:bg-[#161B22]"
          )}
        >
          <Play size={14} />
          <span>EZMOVIE.MOVIE</span>
        </button>
      </div>

      {/* Grid of central components */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-8">
        
        {/* LEFT COLUMN: Controls & Settings Panel - spanning 5 grid slots */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-[#11141B] border border-[#2D333B] rounded">
            <div className="p-4 border-b border-[#2D333B] flex items-center justify-between bg-[#161B22]">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#58A6FF] animate-pulse" />
                <h2 className="text-xs font-bold tracking-wider uppercase text-gray-200 font-mono">
                  {activeTab === "kubhd24" ? "KubHD Range Config" : activeTab === "123hdtv" ? "123HDTV Config Parameters" : activeTab === "ezmovie" ? "EzMovie Config" : "Doo-Nang Config"}
                </h2>
              </div>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 hover:bg-[#202530] text-gray-400 hover:text-[#58A6FF] rounded transition-colors cursor-pointer"
                title="ตั้งค่าขั้นสูง"
              >
                <Settings size={16} className={cn(showSettings && "text-[#58A6FF] rotate-45", "transition-all duration-300")} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* KUBHD24 Configuration Forms */}
              {activeTab === "kubhd24" && (
                <>
                  {/* Category selector */}
                  <div className="flex flex-col gap-1.5 pb-2 border-b border-[#2D333B]/60">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Target Category Node</label>
                    <div className="flex flex-col gap-2">
                      <select
                        disabled={isHarvesting}
                        value={categoryType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCategoryType(val);
                          if (val !== "custom") {
                            setCategoryUrl(val);
                          }
                        }}
                        className="w-full bg-[#161B22] border border-[#2D333B] rounded px-3 py-2 text-[#58A6FF] text-xs font-mono focus:outline-none focus:border-[#58A6FF] bg-opacity-50"
                      >
                        <option value="https://kubhd24.net/category/watch-series/">📺 ซีรีย์หลักทั้งหมด (Watch Series)</option>
                        <option value="https://kubhd24.net/category/thai-dubbed-series/">🇹🇭 ซีรีย์พากย์ไทย (Thai Dubbed-Series)</option>
                        <option value="https://kubhd24.net/category/thai-series/">🍜 ซีรีย์ไทย (Thai-Series)</option>
                        <option value="custom">✏️ กำหนดคีย์ / URL หมวดหมู่อื่นๆ (Custom Category URL)</option>
                      </select>

                      {categoryType === "custom" && (
                        <input
                          type="url"
                          disabled={isHarvesting}
                          value={categoryUrl}
                          onChange={(e) => setCategoryUrl(e.target.value)}
                          placeholder="https://kubhd24.net/category/..."
                          className="w-full bg-[#161B22] border border-[#2D333B] rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#58A6FF] font-mono"
                        />
                      )}
                    </div>
                  </div>

                  {/* Settings parameters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Start Page (1-73)</label>
                      <input
                        type="number"
                        min="1"
                        max="73"
                        disabled={isHarvesting}
                        value={startPage}
                        onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-[#161B22] border border-[#2D333B] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#58A6FF] font-mono disabled:opacity-50"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">End Page</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        disabled={isHarvesting}
                        value={endPage}
                        onChange={(e) => setEndPage(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-[#161B22] border border-[#2D333B] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#58A6FF] font-mono disabled:opacity-50"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* 123HDTV Configuration Forms */}
              {activeTab === "123hdtv" && (
                <div className="flex flex-col gap-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Post ID</label>
                      <input
                        type="number"
                        min="1"
                        disabled={isHarvesting}
                        value={postId123}
                        onChange={(e) => setPostId123(parseInt(e.target.value) || 0)}
                        className="w-full bg-[#161B22] border border-[#2D333B] rounded px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-[#58A6FF]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Nonce Key</label>
                      <input
                        type="text"
                        disabled={isHarvesting}
                        value={nonce123}
                        onChange={(e) => setNonce123(e.target.value)}
                        className="w-full bg-[#161B22] border border-[#2D333B] rounded px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-[#58A6FF]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Episodes Count</label>
                      <input
                        type="number"
                        min="1"
                        disabled={isHarvesting}
                        value={totalEpisodes123}
                        onChange={(e) => setTotalEpisodes123(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-[#161B22] border border-[#2D333B] rounded px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-[#58A6FF]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Slug / Link ID</label>
                      <input
                        type="text"
                        disabled={isHarvesting}
                        value={slug123}
                        onChange={(e) => setSlug123(e.target.value)}
                        className="w-full bg-[#161B22] border border-[#2D333B] rounded px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-[#58A6FF]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Series Title (แสดงผล)</label>
                    <input
                      type="text"
                      disabled={isHarvesting}
                      value={title123}
                      onChange={(e) => setTitle123(e.target.value)}
                      className="w-full bg-[#161B22] border border-[#2D333B] rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#58A6FF]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Poster Image Address</label>
                    <input
                      type="text"
                      disabled={isHarvesting}
                      value={poster123}
                      onChange={(e) => setPoster123(e.target.value)}
                      className="w-full bg-[#161B22] border border-[#2D333B] rounded px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-[#58A6FF]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Synopsis Description</label>
                    <textarea
                      disabled={isHarvesting}
                      value={synopsis123}
                      onChange={(e) => setSynopsis123(e.target.value)}
                      rows={2}
                      className="w-full bg-[#161B22] border border-[#2D333B] rounded px-3 py-1.5 text-white text-xs resize-none focus:outline-none focus:border-[#58A6FF]"
                    />
                  </div>
                </div>
              )}

              {/* DOO-NANG Configuration Forms */}
              {activeTab === "doonang" && (
                <div className="flex flex-col gap-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Target Page No.</label>
                      <input
                        type="number"
                        min="1"
                        disabled={isHarvesting}
                        value={pageDoonang}
                        onChange={(e) => setPageDoonang(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-[#161B22] border border-[#2D333B] rounded px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-[#58A6FF]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Limit (Max Count)</label>
                      <input
                        type="number"
                        min="1"
                        disabled={isHarvesting}
                        value={limitDoonang}
                        onChange={(e) => setLimitDoonang(Math.max(1, parseInt(e.target.value) || 24))}
                        className="w-full bg-[#161B22] border border-[#2D333B] rounded px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-[#58A6FF]"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 bg-[#0d1117] p-3 rounded border border-[#2D333B] font-mono leading-relaxed">
                    🌟 โหลดคลังวิดีโอหมวดหมู่ Netflix (serie-tag) ล่าสุดจากเซิร์ฟเวอร์แบบ GraphQL และทำการจัดเตรียมลิสต์ .m3u8 เพลย์ลิสต์ให้อย่างรวดเร็ว
                  </span>
                </div>
              )}

              {/* EZMOVIE Configuration Forms */}
              {activeTab === "ezmovie" && (
                <div className="flex flex-col gap-3 pt-1">
                  {/* Category selector */}
                  <div className="flex flex-col gap-1.5 pb-2 border-b border-[#2D333B]/60">
                    <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Target Category Node</label>
                    <select
                      disabled={isHarvesting}
                      value={ezCategory}
                      onChange={(e) => setEzCategory(e.target.value)}
                      className="w-full bg-[#161B22] border border-[#2D333B] rounded px-3 py-2 text-[#58A6FF] text-xs font-mono focus:outline-none focus:border-[#58A6FF] bg-opacity-50 font-semibold"
                    >
                      <option value="/movies/หนังมาใหม่">🎬 หนังมาใหม่ทั้งหมด (New Movies)</option>
                      <option value="/movies/หนังไทย">🇹🇭 หนังไทย (Thai Movies)</option>
                      <option value="/movies/หนังฝรั่ง">🇺🇸 หนังฝรั่ง (Western Movies)</option>
                      <option value="/movies/หนังเอเชีย">🇨🇳 หนังเอเชีย (Asian Movies)</option>
                      <option value="/movies/หนังแอคชั่นบู๊-action">💥 หนังบู๊แอคชั่น (Action)</option>
                      <option value="/movies/หนังดราม่า-drama">😭 หนังดราม่าชีวิต (Drama)</option>
                      <option value="/movies/หนังผจญภัย-adventure">🗺️ หนังผจญภัย (Adventure)</option>
                      <option value="/movies/หนังเกาหลี">🇰🇷 หนังเกาหลี (Korean Movies)</option>
                      <option value="/movies/หนังญี่ปุ่น">🇯🇵 หนังญี่ปุ่น (Japanese Movies)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Start Page</label>
                      <input
                        type="number"
                        min="1"
                        disabled={isHarvesting}
                        value={ezStartPage}
                        onChange={(e) => setEzStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-[#161B22] border border-[#2D333B] rounded px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-[#58A6FF]"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">End Page</label>
                      <input
                        type="number"
                        min="1"
                        disabled={isHarvesting}
                        value={ezEndPage}
                        onChange={(e) => setEzEndPage(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-[#161B22] border border-[#2D333B] rounded px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-[#58A6FF]"
                      />
                    </div>
                  </div>

                  <span className="text-[10px] text-[#58A6FF]/90 bg-[#58A6FF]/5 p-3 rounded border border-[#58A6FF]/10 font-mono leading-relaxed">
                    🌟 ดึงข้อมูลจากคลังภาพยนตร์ ezmovie.movie โดยอัตโนมัติ ด้วยระบบระบุ iframe แปลงไฟล์ M3U8 เพลย์ลิสต์ตรงระดับพรีเมี่ยม
                  </span>
                </div>
              )}

              {/* Advanced collapsable settings block */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-[#0D1117] rounded p-4 border border-[#2D333B] flex flex-col gap-3.5"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase text-gray-400 font-mono tracking-wider">หน่วงเวลาดีเลย์ระลอกซีรีย์</label>
                        <span className="text-xs text-[#58A6FF] font-mono font-semibold">{delayMs} ms</span>
                      </div>
                      <input
                        type="range"
                        min="200"
                        max="5000"
                        step="100"
                        disabled={isHarvesting}
                        value={delayMs}
                        onChange={(e) => setDelayMs(parseInt(e.target.value))}
                        className="w-full accent-[#58A6FF] cursor-pointer disabled:opacity-50"
                      />
                      <span className="text-[10px] text-gray-500 leading-tight font-mono">
                        *ช่วยลดโอกาสโดนแบนไอพีและการปฏิเสธคำขอจาก Cloudflare แนะนำ 1000ms+
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#2D333B] pt-3.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono text-gray-300">ล้างลิสต์ข้อมูลก่อนหน้า</span>
                        <span className="text-[10px] text-gray-500 font-mono">ล้างคลังซีรีย์ชุดเก่าก่อนเริ่มดึงรอบใหม่</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => !isHarvesting && setClearPrevious(!clearPrevious)}
                        disabled={isHarvesting}
                        className={cn(
                          "w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 cursor-pointer disabled:opacity-50",
                          clearPrevious ? "bg-[#58A6FF] flex justify-end" : "bg-[#2D333B] flex justify-start"
                        )}
                      >
                        <motion.div layout className="w-4.5 h-4.5 rounded-full bg-[#0D1117]" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Status Box block if harvesting */}
              {isHarvesting && (
                <div className="bg-[#161B22] p-4 border border-[#2D333B] border-l-4 border-l-[#58A6FF] rounded-r">
                  <div className="text-xs font-bold text-[#58A6FF] mb-1.5 font-mono animate-pulse uppercase tracking-wider">
                    📍 {isPaused ? "HARVEST STATUS: PAUSED" : "HARVEST STATUS: RUNNING"}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-[#0d1117] h-1.5 border border-[#2d333b] rounded overflow-hidden mt-3 mb-2.5">
                    <motion.div 
                      className="bg-[#58A6FF] h-full"
                      animate={{ 
                        width: `${currentProgress.totalSeriesInPage > 0 ? (currentProgress.seriesIndex / currentProgress.totalSeriesInPage) * 100 : 0}%` 
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-gray-400 font-mono mt-1">
                    <span>PAGE INDEX: <strong className="text-white">{currentProgress.page}</strong></span>
                    <span>QUEUE: <strong className="text-white">{currentProgress.seriesIndex} / {currentProgress.totalSeriesInPage}</strong></span>
                  </div>

                  <div className="text-[10px] text-gray-500 font-mono truncate border-t border-[#2D333B] mt-2.5 pt-2.5 flex items-center gap-1.5">
                    <Film size={11} className="text-[#58A6FF]" />
                    <span className="uppercase text-[9px]">TARGET: </span>
                    <span className="text-gray-300 font-bold max-w-[240px] truncate">{currentProgress.currentSeriesName}</span>
                  </div>
                </div>
              )}

              {/* Primary action controls */}
              <div className="flex flex-col sm:flex-row gap-3 mt-1">
                {!isHarvesting ? (
                  <button
                    onClick={handleExecuteActiveHarvester}
                    id="btn-start"
                    className="flex-1 py-3.5 bg-[#58A6FF] hover:bg-blue-400 text-[#0D1117] font-bold font-mono tracking-widest text-xs uppercase hover:text-black rounded transition-all select-none flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play size={14} fill="currentColor" />
                    <span>🚀 EXECUTE HARVESTER</span>
                  </button>
                ) : (
                  <div className="flex flex-1 gap-2.5 w-full">
                    <button
                      onClick={togglePause}
                      id="btn-pause"
                      className="flex-1 bg-[#2D333B] hover:bg-[#343b45] text-white font-mono text-xs uppercase tracking-wider rounded transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
                      <span>{isPaused ? "RESUME" : "PAUSE"}</span>
                    </button>
                    
                    <button
                      onClick={stopHarvesting}
                      id="btn-stop"
                      className="flex-1 bg-[#F85149] hover:bg-[#da3633] text-white font-mono text-xs uppercase tracking-wider rounded transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <X size={12} />
                      <span>STOP</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Statistics Mini Widget */}
          <div className="bg-[#11141B] border border-[#2D333B] rounded p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#58A6FF]/10 border border-[#58A6FF]/20 text-[#58A6FF] rounded">
                <Tv size={16} />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">SERIES EXTRACTED</div>
                <div className="text-base font-bold text-white leading-tight font-mono mt-0.5">
                  {aggregateStats.seriesCount} <span className="text-[10px] font-normal text-gray-400 font-sans">ITEMS</span>
                </div>
              </div>
            </div>

            <div className="w-[1px] h-8 bg-[#2D333B]" />

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#3FB950]/10 border border-[#3FB950]/20 text-[#3FB950] rounded">
                <Film size={16} />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">LINKS GATHERED</div>
                <div className="text-base font-bold text-white leading-tight font-mono mt-0.5">
                  {aggregateStats.episodeCount} <span className="text-[10px] font-normal text-gray-400 font-sans">EPS</span>
                </div>
              </div>
            </div>

            {activeSeriesList.length > 0 && (
              <button
                onClick={() => downloadM3U(generateMergedM3U(), `${activeTab}-merged-all.m3u`)}
                className="p-1.5 bg-[#161B22] hover:bg-[#58A6FF] border border-[#2D333B] hover:border-[#58A6FF] rounded text-gray-400 hover:text-black transition-all cursor-pointer"
                title="ดาวน์โหลดซีรีย์รวมทั้งหมด (.m3u)"
              >
                <Download size={15} />
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Scraper Logging Terminal Console - spanning 7 grid slots */}
        <div className="lg:col-span-7 h-full flex flex-col">
          <div className="bg-[#010409] border border-[#2D333B] rounded overflow-hidden shadow-2xl flex flex-col h-[385px]">
            <div className="px-4 py-3 border-b border-[#2D333B] flex items-center justify-between bg-[#161B22]">
              <div className="flex items-center gap-2 text-gray-400">
                <Terminal size={12} className="text-[#58A6FF]" />
                <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-300">Runtime Debug Console</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearLogs}
                  className="px-2 py-0.5 text-[9px] font-mono hover:bg-[#202530] text-gray-400 hover:text-white rounded border border-[#2D333B] transition-colors cursor-pointer"
                >
                  CLEAR
                </button>
              </div>
            </div>

            {/* Terminal Body content */}
            <div 
              ref={logContainerRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1.5 bg-[#010409] scrollbar-thin scrollbar-thumb-[#2D333B]"
            >
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 text-center select-none py-12 gap-2">
                  <Terminal size={20} className="opacity-25" />
                  <p className="text-gray-500 text-[10px] uppercase font-mono tracking-wider">[ READY FOR DISCOVERY ]</p>
                  <p className="text-gray-500 text-[10px] max-w-xs leading-normal font-sans">
                    กรอกหน้าเริ่มต้นทางกล่องแผงควบคุม แล้วคลิก &quot;🚀 EXECUTE HARVESTER&quot; เพื่อดึงข้อมูลซีรีย์
                  </p>
                </div>
              ) : (
                logs.map((log, index) => {
                  let badge = "INFO";
                  let badgeClass = "text-[#58A6FF]";
                  if (log.type === "success") {
                    badge = "OK";
                    badgeClass = "text-[#3FB950]";
                  } else if (log.type === "warn") {
                    badge = "WARN";
                    badgeClass = "text-[#D29922]";
                  } else if (log.type === "error") {
                    badge = "FAIL";
                    badgeClass = "text-[#F85149] font-bold";
                  }

                  return (
                    <div key={index} className="flex items-start gap-2 leading-relaxed tracking-wide text-[#8B949E]">
                      <span className="text-gray-600 flex-shrink-0">[{log.timestamp}]</span>
                      <span className="flex-shrink-0">
                        [<span className={badgeClass}>{badge}</span>]
                      </span>
                      <span className="break-all text-gray-300">
                        {log.message}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* SEARCH AND GRID ACTION BAR */}
      <div className="bg-[#11141B] border border-[#2D333B] rounded p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between shadow-md">
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="🔍 ค้นหาซีรีย์ในตารางผลลัพธ์..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#161B22] border border-[#2D333B] rounded pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#58A6FF] font-sans"
          />
        </div>

        {activeSeriesList.length > 0 && (
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => {
                const mergedM3U = generateMergedM3U();
                copyToClipboard(mergedM3U, "merged-bulk");
                addLog("📋 คัดลอกเพลย์ลิสต์รวบรวมทั้งหมดแล้ว!", "success");
              }}
              className="px-3.5 py-1.5 bg-[#161B22] hover:bg-[#58A6FF]/10 hover:text-[#58A6FF] text-gray-300 border border-[#2D333B] text-[11px] font-mono rounded transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedId === "merged-bulk" ? <Check size={12} className="text-[#3FB950]" /> : <Copy size={12} />}
              <span>{copiedId === "merged-bulk" ? "COPIED!" : "COPY BULK M3U"}</span>
            </button>

            <button
              onClick={() => downloadM3U(generateMergedM3U(), `${activeTab}-series-bulk.m3u`)}
              className="px-3.5 py-1.5 bg-[#3FB950] hover:bg-emerald-400 text-[#0A0C10] font-bold text-[11px] font-mono rounded transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={12} />
              <span>DOWNLOAD ALL M3U ({activeSeriesList.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* GRID SECTOR: Scraped Series Cards */}
      {filteredSeriesList.length === 0 ? (
        <div className="bg-[#11141B] border border-[#2D333B] border-dashed rounded p-16 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-12 h-12 bg-[#161B22] border border-[#2D333B] rounded flex items-center justify-center text-gray-500">
            <Film size={20} />
          </div>
          <div className="max-w-md">
            <h3 className="text-sm font-bold text-white mb-1 font-mono uppercase tracking-wider">Empty Result Set</h3>
            <p className="text-xs text-gray-400 font-sans">
              {searchQuery ? "ไม่พบข้อมูลซีรีย์ที่ค้นหา ลองพิมพ์ตัวอักษรอื่น" : "ปรับพารามิเตอร์ของหน้าแล้วเริ่มคลิก '🚀 EXECUTE HARVESTER' เพื่อเก็บเกี่ยวข้อมูล!"}
            </p>
          </div>
        </div>
      ) : (
        <motion.div 
          layout 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredSeriesList.map((item) => {
            const m3uContent = generateM3UOfSeries(item);
            return (
              <motion.div
                layout
                key={item.id}
                className="bg-[#11141B] border border-[#2D333B] border-l-4 border-l-[#58A6FF] hover:border-[#58A6FF]/30 rounded overflow-hidden shadow transition-all flex flex-col group"
              >
                {/* Visual Thumbnail */}
                <div className="relative h-44 w-full bg-black overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.poster}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${item.id}/400/220`;
                    }}
                  />
                  
                  {/* Overlay background shade */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  
                  {/* Badges overlay */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 bg-[#161B22]/90 border border-[#2D333B] text-white rounded text-[10px] font-mono leading-none flex items-center">
                      P. {item.pageNum}
                    </span>
                    <span className="px-2 py-0.5 bg-[#58A6FF] text-[#0D1117] font-mono font-bold rounded text-[10px] leading-none flex items-center">
                      {item.episodes.length} EPS
                    </span>
                  </div>
                </div>

                {/* Card Info Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white line-clamp-1 mb-1.5 tracking-tight group-hover:text-[#58A6FF] transition-colors" title={item.title}>
                      {item.title}
                    </h3>
                    
                    <p className="text-[10px] text-gray-500 font-mono mb-3.5 break-all">
                      ID: {item.id}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-[#2D333B] pt-3 mt-auto">
                    
                    {/* Expand Stream Items buttons */}
                    <button
                      onClick={() => handleSelectSeries(selectedSeries?.id === item.id ? null : item)}
                      className="w-full py-1.5 bg-[#161B22] hover:bg-[#202530] border border-[#2D333B] hover:border-[#58A6FF]/20 font-mono text-[10px] text-gray-200 rounded transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FolderOpen size={11} className="text-[#58A6FF]" />
                      <span>{selectedSeries?.id === item.id ? "CLOSE FOLDER" : "OPEN EPISODE DIRECT STREAM"}</span>
                    </button>

                    {activeTab === "123hdtv" ? (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => copyToClipboard(m3uContent, item.id)}
                            className="py-1.5 bg-[#161B22] hover:bg-[#202530] border border-[#2D333B] font-mono text-[10px] text-gray-300 rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {copiedId === item.id ? <Check size={11} className="text-[#3FB950]" /> : <Copy size={11} />}
                            <span>COPY M3U</span>
                          </button>

                          <button
                            onClick={() => {
                              copyToClipboard(generateJSONOfSeries(item), `${item.id}-json`);
                              addLog(`📋 คัดลอกรูปแบบ JSON ของซีรีย์ ${item.title} แล้ว!`, "success");
                            }}
                            className="py-1.5 bg-[#161B22] hover:bg-[#202530] border border-[#2D333B] font-mono text-[10px] text-gray-300 rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {copiedId === `${item.id}-json` ? <Check size={11} className="text-[#3FB950]" /> : <Copy size={11} />}
                            <span>COPY JSON</span>
                          </button>
                        </div>

                        <button
                          onClick={() => downloadM3U(m3uContent, `${item.id}-playlist.m3u`)}
                          className="py-1.5 bg-[#3FB950]/15 hover:bg-[#3FB950]/25 text-[#3FB950] border border-[#3FB950]/30 font-mono text-[10px] rounded transition-colors flex items-center justify-center gap-1 cursor-pointer w-full"
                        >
                          <Download size={11} />
                          <span>DOWNLOAD M3U</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => copyToClipboard(m3uContent, item.id)}
                          className="py-1.5 bg-[#161B22] hover:bg-[#202530] border border-[#2D333B] font-mono text-[10px] text-gray-300 rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          {copiedId === item.id ? <Check size={11} className="text-[#3FB950]" /> : <Copy size={11} />}
                          <span>COPY M3U</span>
                        </button>

                        <button
                          onClick={() => downloadM3U(m3uContent, `${item.id}-playlist.m3u`)}
                          className="py-1.5 bg-[#161B22] hover:bg-[#202530] border border-[#2D333B] font-mono text-[10px] text-gray-300 rounded transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Download size={11} className="text-[#58A6FF]" />
                          <span>DOWNLOAD</span>
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* DIALOG DETAILS MODAL: Expanding individual series details logic */}
      <AnimatePresence>
        {selectedSeries && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop cover overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleSelectSeries(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm cursor-pointer"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl bg-[#11141B] border border-[#2D333B] rounded overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
            >
              {/* Top title info bar */}
              <div className="px-5 py-3 border-b border-[#2D333B] flex justify-between items-center bg-[#161B22]">
                <div className="flex items-center gap-3">
                  <span className="p-1.5 bg-[#58A6FF]/10 text-[#58A6FF] rounded">
                    <Tv size={15} />
                  </span>
                  <div>
                    <h3 className="font-bold text-white text-xs leading-none pr-4 line-clamp-1 font-mono uppercase tracking-wider">{selectedSeries.title}</h3>
                    <p className="text-[10px] text-gray-500 font-mono mt-1">ID: {selectedSeries.id} | Page: {selectedSeries.pageNum}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => handleSelectSeries(null)}
                  className="p-1 hover:bg-[#202530] text-gray-400 hover:text-white rounded transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Integrated HD Widescreen Video Player */}
              <div className="w-full aspect-video bg-[#010409] border-b border-[#2D333B] relative group overflow-hidden flex flex-col items-center justify-center">
                {activeEpisode ? (
                  <div className="w-full h-full relative">
                    <video
                      ref={videoRef}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                    />
                    {/* Floating Info Overlay */}
                    <div className="absolute top-3 left-3 bg-[#0D1117]/85 backdrop-blur-md px-2.5 py-1 rounded text-[10px] font-mono border border-[#2D333B] text-[#58A6FF] pointer-events-none flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#58A6FF] rounded-full animate-ping" />
                      <span>DIRECT CAPTURE: {activeEpisode.title}</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full relative flex flex-col items-center justify-center p-6 text-center select-none">
                    <div className="absolute inset-0 opacity-15 blur-md pointer-events-none">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedSeries.poster} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D1117] via-[#010409]/90 to-transparent" />
                    
                    <div className="relative z-10 flex flex-col items-center gap-3.5">
                      <button
                        onClick={() => {
                          if (selectedSeries.episodes.length > 0) {
                            setActiveEpisode({
                              title: selectedSeries.episodes[0].title,
                              url: selectedSeries.episodes[0].url,
                              index: 0
                            });
                          }
                        }}
                        className="w-14 h-14 bg-[#58A6FF]/10 hover:bg-[#58A6FF]/25 border border-[#58A6FF]/35 hover:border-[#58A6FF]/60 text-[#58A6FF] rounded-full flex items-center justify-center cursor-pointer hover:scale-105 transition-all shadow-xl group/btn animate-pulse"
                      >
                        <Play size={22} className="ml-0.5 text-[#58A6FF] transition-transform duration-300 group-hover/btn:scale-110" fill="currentColor" />
                      </button>
                      <div>
                        <span className="text-[9px] text-[#58A6FF] uppercase tracking-widest font-mono border border-[#58A6FF]/25 px-2 py-0.5 rounded bg-[#58A6FF]/5">STREAM PLAYER PORT</span>
                        <h3 className="text-sm font-bold text-gray-200 mt-2 font-mono uppercase tracking-wider">{selectedSeries.title}</h3>
                        <p className="text-xs text-gray-400 mt-1.5">คลิกที่ปุ่มเพื่อเล่นตอนแรก หรือเลือกตอนเฉพาะเจาะจงจากลิสต์ด้านล่าง</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Body lists containing actual scraped streaming items */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#0D1117]">
                <div className="flex flex-col md:flex-row gap-5">
                  {/* Left part preview thumbnail */}
                  <div className="hidden md:flex flex-col gap-3 w-32 flex-shrink-0">
                    <div className="aspect-[3/4.2] rounded overflow-hidden border border-[#2D333B] bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedSeries.poster}
                        alt={selectedSeries.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${selectedSeries.id}/300/440`;
                        }}
                      />
                    </div>
                  </div>

                  {/* Right segment detailing episode stream data */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <h4 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center justify-between border-b border-[#2D333B]/40 pb-1.5">
                      <span>EPISODE MATRIX STREAM ({selectedSeries.episodes.length} EPISODES):</span>
                      {activeEpisode && (
                        <button 
                          onClick={() => setActiveEpisode(null)}
                          className="text-[9px] text-[#F85149] hover:underline uppercase font-mono tracking-wider cursor-pointer"
                        >
                          [ STOP STREAM ]
                        </button>
                      )}
                    </h4>

                    {selectedSeries.episodes.length === 0 ? (
                      <div className="p-5 bg-black/30 border border-[#2D333B] rounded text-center text-gray-500 text-xs font-mono">
                        ไม่พบคลังวิดีโอตอนย่อย
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#2D333B]">
                        {selectedSeries.episodes.map((ep, idx) => {
                          const isPlaying = activeEpisode?.index === idx;
                          return (
                            <div 
                              key={idx}
                              onClick={() => {
                                setActiveEpisode({ title: ep.title, url: ep.url, index: idx });
                                addLog(`🎬 สั่งสตรีมมิ่งตอน: ${selectedSeries.title} - ${ep.title}`, "info");
                              }}
                              className={cn(
                                "border rounded p-2 flex items-center justify-between gap-3 text-xs transition-all cursor-pointer group/item",
                                isPlaying 
                                  ? "bg-[#58A6FF]/10 border-[#58A6FF] text-[#58A6FF]" 
                                  : "bg-[#161B22] hover:bg-[#1a1f29] border-[#2D333B] hover:border-[#58A6FF]/20 text-gray-300"
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div className={cn(
                                  "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors",
                                  isPlaying 
                                    ? "bg-[#58A6FF] text-[#0A0C10]" 
                                    : "bg-[#0D1117] text-gray-400 group-hover/item:text-[#58A6FF] group-hover/item:bg-[#58A6FF]/15"
                                )}>
                                  <Play size={10} fill="currentColor" />
                                </div>
                                <span className={cn(
                                  "font-bold truncate font-mono text-[11px]",
                                  isPlaying ? "text-[#58A6FF]" : "text-gray-200"
                                )}>
                                  {ep.title}
                                </span>
                              </div>
                              
                              <span className="text-[10px] text-gray-500 font-mono break-all flex-1 text-right truncate pl-2">
                                {isPlaying ? "⚡ NOW STREAMING" : ep.url}
                              </span>
                              
                              <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => copyToClipboard(ep.url, `${selectedSeries.id}-${idx}`)}
                                  className="p-1 bg-[#010409] hover:bg-[#58A6FF] hover:text-[#0D1117] border border-[#2D333B] rounded text-[10px] text-gray-400 transition-colors cursor-pointer"
                                  title="ก็อบปี้ลิงค์ M3U8"
                                >
                                  {copiedId === `${selectedSeries.id}-${idx}` ? (
                                    <Check size={11} className="text-[#3FB950]" />
                                  ) : (
                                    <Copy size={11} />
                                  )}
                                </button>

                                <a
                                  href={ep.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 bg-[#010409] hover:bg-[#3FB950] hover:text-[#0D1117] border border-[#2D333B] rounded text-[10px] text-gray-400 transition-colors cursor-pointer"
                                  title="เปิดทดสอบสตรีมเมอร์"
                                >
                                  <ExternalLink size={11} />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Individual M3U console codes preview */}
                <div className="flex flex-col gap-1 mt-2">
                  <div className="flex justify-between items-center bg-[#161B22] border border-[#2D333B] px-4 py-2 rounded-t">
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">M3U Content Preview:</span>
                    <button
                      onClick={() => copyToClipboard(generateM3UOfSeries(selectedSeries), "m3u-modal-raw")}
                      className="text-[10px] text-[#58A6FF] hover:text-white font-mono flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === "m3u-modal-raw" ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedId === "m3u-modal-raw" ? "COPIED" : "COPY M3U ARRAY"}</span>
                    </button>
                  </div>
                  <pre className="block bg-[#010409] text-[#7EE787] p-3 text-[10px] leading-relaxed rounded-b border border-[#2D333B] max-h-36 overflow-auto font-mono scrollbar-thin scrollbar-thumb-[#2D333B]">
                    {generateM3UOfSeries(selectedSeries)}
                  </pre>
                </div>
              </div>

              {/* Bottom footer bar containing merge controls */}
              <div className="p-4 border-t border-[#2D333B] bg-[#161B22] flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-500">
                  *เพื่อความสะดวก สามารถโหลดไฟล์ M3U ไปใช้เปิดในแอพ IPTV ได้โดยตรง
                </span>
                
                <button
                  onClick={() => downloadM3U(generateM3UOfSeries(selectedSeries), `${selectedSeries.id}-playlist.m3u`)}
                  className="px-3.5 py-1.5 bg-[#58A6FF] hover:bg-blue-400 text-[#0A0C10] font-bold text-xs font-mono rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Download size={12} />
                  <span>DOWNLOAD M3U</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
