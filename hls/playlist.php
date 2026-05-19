<?php
header('Content-Type: application/vnd.apple.mpegurl');

$metaID = isset($_GET['metaID']) ? $_GET['metaID'] : null;

if (!$metaID) {
  echo "#EXTM3U\n#EXT-X-ERROR: Missing metaID";
  exit;
}

echo "#EXTM3U\n";
echo "#EXT-X-VERSION:3\n\n";

echo "#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID=\"aac\",LANGUAGE=\"eng\",NAME=\"ENG\",DEFAULT=YES,AUTOSELECT=YES,URI=\"https://statics-01.duckduckcdn.com/$metaID/audio-eng/audio.m3u8\"\n";
echo "#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID=\"aac\",LANGUAGE=\"tha\",NAME=\"THA\",DEFAULT=NO,AUTOSELECT=NO,URI=\"https://statics-01.duckduckcdn.com/$metaID/audio-tha/audio.m3u8\"\n\n";

echo "#EXT-X-STREAM-INF:BANDWIDTH=3500000,RESOLUTION=1920x1080,CODECS=\"avc1.4d401e,mp4a.40.2\",AUDIO=\"aac\"\n";
echo "https://statics-01.duckduckcdn.com/$metaID/videos/1080p.m3u8\n";

echo "#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720,CODECS=\"avc1.4d401e,mp4a.40.2\",AUDIO=\"aac\"\n";
echo "https://statics-01.duckduckcdn.com/$metaID/videos/720p.m3u8\n";

echo "#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=854x480,CODECS=\"avc1.4d401e,mp4a.40.2\",AUDIO=\"aac\"\n";
echo "https://statics-01.duckduckcdn.com/$metaID/videos/480p.m3u8\n";
?>
