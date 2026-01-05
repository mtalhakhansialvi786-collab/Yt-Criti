const express = require('express');
const cors = require('cors');
const YTDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs');

// Docker/Koyeb environment ke liye global path
const ytDlpPath = 'yt-dlp'; 
const ytDlpWrap = new YTDlpWrap(ytDlpPath);

const app = express();

// Aapka original CORS setup
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Cookies paths
const rawCookiesPath = path.join(__dirname, 'cookies.txt');
const cleanCookiesPath = path.join(__dirname, 'clean_cookies.txt');

// Cookies fix karne ka function (Netscape format ensure karne ke liye)
const fixAndGetCookies = () => {
    try {
        if (fs.existsSync(rawCookiesPath)) {
            let content = fs.readFileSync(rawCookiesPath, 'utf8');
            content = content.replace(/^\uFEFF/, '').trim();
            if (!content.startsWith('# Netscape')) {
                content = '# Netscape HTTP Cookie File\n' + content;
            }
            fs.writeFileSync(cleanCookiesPath, content, 'utf8');
            return true;
        }
    } catch (e) {
        console.error("Cookie processing error:", e);
    }
    return false;
};

const hasCookies = fixAndGetCookies();

// 🚀 FIX: Favicon 404 Error (Browser ko icon provide karna)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Engine Status
app.get('/health', (req, res) => res.json({ 
    status: 'online', 
    engine: 'Critixo-Ultra-V10-Ultimate-Bypass', 
    cookies_valid: hasCookies,
    uptime: process.uptime()
}));

// 1. Meta Fetcher (Ultimate Bypass logic)
app.get('/video-info', async (req, res) => {
    const videoURL = req.query.url;
    if(!videoURL) return res.status(400).send("URL required");

    try {
        let args = [
            videoURL, 
            '--no-playlist', 
            '--no-check-certificates',
            '--no-warnings',
            '--geo-bypass',
            // 🚀 SUPER STRONG BYPASS: Real Browser User-Agent
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            // YouTube's New Bot Detection Bypass
            '--extractor-args', 'youtube:player_client=android,ios,web;player_skip_subscribe_check=True',
            '--dump-json'
        ];

        if(hasCookies) {
            args.push('--cookies', cleanCookiesPath);
        }

        let metadata = await ytDlpWrap.getVideoInfo(args);
        
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
        console.error("Extraction Error:", err.message);
        // Detail error bhejna taake debug ho sake
        res.status(500).json({ 
            error: "Extraction Failed", 
            details: err.message.substring(0, 200),
            cookies_status: hasCookies ? "Found" : "Missing",
            tip: "Check Koyeb logs for 'Sign in to confirm you're not a bot'"
        });
    }
});

// 2. Stream Engine (Aapka original download logic)
app.get('/download', async (req, res) => {
    const { url, type } = req.query;
    
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Connection', 'keep-alive');
    
    let args = [
        url, '-o', '-', 
        '--no-playlist', 
        '--no-check-certificates',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '--extractor-args', 'youtube:player_client=android,web',
        '--buffer-size', '1M',
        '--no-part'
    ]; 

    if(hasCookies) {
        args.push('--cookies', cleanCookiesPath);
    }

    // Aapke saare formats unchanged
    if (type === '4k') args.push('-f', 'bestvideo[height<=2160]+bestaudio/best');
    else if (type === 'hd') args.push('-f', 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]');
    else if (type === '720p') args.push('-f', 'best[height<=720][ext=mp4]');
    else if (type === '360p') args.push('-f', 'best[height<=360][ext=mp4]');
    else if (type === 'audio') {
        args.push('-f', 'bestaudio', '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '320K');
    } else if (type === '128k') {
        args.push('-f', 'bestaudio', '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '128K');
    } else {
        args.push('-f', 'best');
    }

    try {
        const ytStream = ytDlpWrap.execStream(args);
        
        ytStream.on('error', (err) => {
            console.error("Stream Error:", err);
            if(!res.headersSent) res.status(500).end();
        });

        ytStream.pipe(res);

        req.on('close', () => {
            if (ytStream) ytStream.destroy();
        });

    } catch (error) {
        console.error("Download Error:", error);
        if(!res.headersSent) res.status(500).end();
    }
});

// Koyeb Port Management
const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CRITIXO ULTRA V10 ACTIVE ON PORT ${PORT}`);
});

module.exports = app;
