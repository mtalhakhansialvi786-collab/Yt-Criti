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

// Engine Status
app.get('/health', (req, res) => res.json({ 
    status: 'online', 
    engine: 'Critixo-Ultra-V9.5-Super-Strong-Final', 
    cookies_valid: hasCookies,
    uptime: process.uptime()
}));

// 1. Meta Fetcher (Bypass logic enhanced)
app.get('/video-info', async (req, res) => {
    const videoURL = req.query.url;
    if(!videoURL) return res.status(400).send("URL required");

    try {
        let args = [
            videoURL, 
            '--no-playlist', 
            '--no-check-certificates',
            '--no-warnings',
            // 🚀 SUPER STRONG BYPASS: Mixed Client Spoofing
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            '--extractor-args', 'youtube:player_client=android,web,ios;player_skip_subscribe_check=True;include_live_dash',
            '--geo-bypass',
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
        console.error("Extraction Error:", err);
        res.status(500).json({ 
            error: "YouTube Security Block", 
            details: err.message,
            solution: "Change your YouTube cookies or try a different region in Koyeb."
        });
    }
});

// 2. Stream Engine (Strong download logic)
app.get('/download', async (req, res) => {
    const { url, type } = req.query;
    
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Connection', 'keep-alive');
    
    let args = [
        url, '-o', '-', 
        '--no-playlist', 
        '--no-check-certificates',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        '--extractor-args', 'youtube:player_client=android,web',
        '--buffer-size', '1M',
        '--no-part'
    ]; 

    if(hasCookies) {
        args.push('--cookies', cleanCookiesPath);
    }

    // Aapke original formats (4k, hd, 720p, 360p, audio, 128k)
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
    console.log(`🚀 SUPER STRONG ENGINE ACTIVE ON PORT ${PORT}`);
});

module.exports = app;
