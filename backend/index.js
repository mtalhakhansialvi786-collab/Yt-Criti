const express = require('express');
const cors = require('cors');
const YTDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');

// Koyeb par binary project folder mein hoti hai, is liye path dena zaroori hai
const ytDlpPath = path.join(__dirname, 'yt-dlp');
const ytDlpWrap = new YTDlpWrap(ytDlpPath);

const app = express();
app.use(cors());
app.use(express.json());

// Engine Status
app.get('/health', (req, res) => res.json({ 
    status: 'online', 
    engine: 'Critixo-Ultra-V9.5-Audio-Ready', 
    uptime: process.uptime()
}));

// 1. Meta Fetcher
app.get('/video-info', async (req, res) => {
    const videoURL = req.query.url;
    if(!videoURL) return res.status(400).send("URL required");

    try {
        let metadata = await ytDlpWrap.getVideoInfo([
            videoURL, 
            '--no-playlist', 
            '--no-check-certificates',
            '--youtube-skip-dash-manifest',
            '--no-warnings'
        ]);
        
        const rawSize = metadata.filesize_approx || metadata.filesize || 0;

        res.json({
            id: metadata.id,
            title: metadata.title,
            thumbnail: metadata.thumbnail,
            duration: metadata.duration_string,
            view_count: metadata.view_count?.toLocaleString() || "N/A",
            uploader: metadata.uploader,
            filesize_raw: rawSize,
            filesize_formatted: rawSize ? (rawSize / (1024 * 1024)).toFixed(2) + " MB" : "Dynamic Size",
            clean_name: metadata.title.replace(/[^\w\s]/gi, '').substring(0, 50)
        });
    } catch (err) {
        console.error("Extraction Error:", err);
        res.status(500).send("Extraction Failed");
    }
});

// 2. Stream Engine
app.get('/download', async (req, res) => {
    const { url, type, title } = req.query;
    
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Connection', 'keep-alive');
    
    let args = [
        url, '-o', '-', '--no-playlist', 
        '--buffer-size', '1M', 
        '--no-part', 
        '--concurrent-fragments', '16', 
        '--no-check-certificates'
    ]; 

    if (type === '4k') args.push('-f', 'bestvideo[height<=2160]+bestaudio/best');
    else if (type === 'hd') args.push('-f', 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]');
    else if (type === '720p') args.push('-f', 'best[height<=720][ext=mp4]');
    else if (type === '360p') args.push('-f', 'best[height<=360][ext=mp4]');
    else if (type === 'audio') {
        args.push('-f', 'bestaudio', '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '320K');
    } else if (type === '128k') {
        args.push('-f', 'bestaudio', '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '128K');
    }

    try {
        const ytStream = ytDlpWrap.execStream(args);
        ytStream.pipe(res);

        req.on('close', () => {
            if (ytStream) ytStream.destroy();
        });

        ytStream.on('error', (err) => {
            console.error("Stream Error:", err);
            if(!res.headersSent) res.status(500).end();
        });
    } catch (error) {
        if(!res.headersSent) res.status(500).end();
    }
});

// Koyeb hamesha environment variable se PORT uthata hai
const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 CRITIXO ULTRA V9.5 ACTIVE ON PORT ${PORT}`));

// Compatibility ke liye export
module.exports = app;
