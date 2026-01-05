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

// Cookies fix karne ka function (Jo Netscape format error ko khatam karega)
const fixAndGetCookies = () => {
    try {
        if (fs.existsSync(rawCookiesPath)) {
            let content = fs.readFileSync(rawCookiesPath, 'utf8');
            
            // Hidden characters aur extra spaces khatam karna
            content = content.replace(/^\uFEFF/, '').trim();
            
            // Agar header missing ho to add karna
            if (!content.startsWith('# Netscape')) {
                content = '# Netscape HTTP Cookie File\n' + content;
            }

            // Clean file save karna taake yt-dlp khush rahe
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
    engine: 'Critixo-Ultra-V9.5-Audio-Ready', 
    cookies_valid: hasCookies,
    uptime: process.uptime()
}));

// 1. Meta Fetcher (Aapka original logic)
app.get('/video-info', async (req, res) => {
    const videoURL = req.query.url;
    if(!videoURL) return res.status(400).send("URL required");

    try {
        let args = [
            videoURL, 
            '--no-playlist', 
            '--no-check-certificates',
            '--no-warnings',
            // Spoofing Android User-Agent to bypass data-center blocks
            '--user-agent', 'com.google.android.youtube/19.29.37 (Linux; U; Android 11; en_US; Pixel 4 XL; Build/RP1A.200720.009)',
            // YouTube Bot Detection Bypass Arguments - Mazeed Sakht Bypass
            '--extractor-args', 'youtube:player_client=android,web;include_live_dash',
            '--geo-bypass',
            '--dump-json'
        ];

        // Cleaned cookies use karna
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
            error: "Extraction Failed", 
            details: err.message,
            cookies_status: hasCookies ? "Processed & Cleaned" : "Invalid/Missing",
            solution: "Ensure cookies.txt is in Netscape format and pushed to GitHub"
        });
    }
});

// 2. Stream Engine (Aapka original download logic)
app.get('/download', async (req, res) => {
    const { url, type, title } = req.query;
    
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Connection', 'keep-alive');
    
    let args = [
        url, '-o', '-', '--no-playlist', 
        '--buffer-size', '1M', 
        '--no-part', 
        '--concurrent-fragments', '16', 
        '--no-check-certificates',
        '--user-agent', 'com.google.android.youtube/19.29.37 (Linux; U; Android 11; en_US; Pixel 4 XL; Build/RP1A.200720.009)',
        '--extractor-args', 'youtube:player_client=android,web'
    ]; 

    if(hasCookies) {
        args.push('--cookies', cleanCookiesPath);
    }

    // Aapke saare formats (4k, hd, 720p, 360p, audio, 128k) - Bilkul same rakhe hain
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
    console.log(`🚀 CRITIXO ULTRA V9.5 ACTIVE ON PORT ${PORT}`);
});

module.exports = app;
