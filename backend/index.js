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

// Cookies file ka path
const cookiesPath = path.join(__dirname, 'cookies.txt');

// Cookies check karne ka behtar tariqa (Programmatic check)
const getValidCookies = () => {
    try {
        if (fs.existsSync(cookiesPath)) {
            const content = fs.readFileSync(cookiesPath, 'utf8');
            // Check karein ke Netscape header mojud hai ya nahi
            if (content.includes('Netscape')) {
                return true;
            }
        }
    } catch (e) {
        console.error("Cookie check error:", e);
    }
    return false;
};

const hasCookies = getValidCookies();

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
            // User-Agent taake YouTube ko lage ye browser hai
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];

        // Agar cookies.txt valid hai to use karein
        if(hasCookies) {
            args.push('--cookies', cookiesPath);
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
            cookies_status: hasCookies ? "Valid Format" : "Invalid/Missing",
            solution: "Check cookies.txt encoding (should be UTF-8)"
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
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]; 

    if(hasCookies) {
        args.push('--cookies', cookiesPath);
    }

    // Aapke saare formats bilkul same hain:
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
