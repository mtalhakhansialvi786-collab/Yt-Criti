const express = require('express');
const cors = require('cors');
const YTDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs');

const ytDlpPath = 'yt-dlp'; 
const ytDlpWrap = new YTDlpWrap(ytDlpPath);

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Cookies file ka path check karein
const cookiesPath = path.join(__dirname, 'cookies.txt');
const hasCookies = fs.existsSync(cookiesPath);

app.get('/health', (req, res) => res.json({ 
    status: 'online', 
    engine: 'Critixo-Ultra-V9.5',
    cookies_active: hasCookies
}));

app.get('/video-info', async (req, res) => {
    const videoURL = req.query.url;
    if(!videoURL) return res.status(400).send("URL required");

    try {
        let args = [
            videoURL, 
            '--no-playlist', 
            '--no-check-certificates',
            '--no-warnings'
        ];

        // Agar cookies.txt mojud hai to use karein
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
        res.status(500).json({ error: "Extraction Failed", details: err.message });
    }
});

app.get('/download', async (req, res) => {
    const { url, type } = req.query;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Connection', 'keep-alive');
    
    let args = [
        url, '-o', '-', '--no-playlist', 
        '--buffer-size', '1M', 
        '--no-part', 
        '--no-check-certificates'
    ]; 

    if(hasCookies) {
        args.push('--cookies', cookiesPath);
    }

    if (type === '4k') args.push('-f', 'bestvideo+bestaudio/best');
    else if (type === 'hd') args.push('-f', 'bestvideo[height<=1080]+bestaudio/best');
    else if (type === 'audio') {
        args.push('-f', 'bestaudio', '--extract-audio', '--audio-format', 'mp3');
    } else {
        args.push('-f', 'best');
    }

    try {
        const ytStream = ytDlpWrap.execStream(args);
        ytStream.on('error', (err) => {
            if(!res.headersSent) res.status(500).end();
        });
        ytStream.pipe(res);
        req.on('close', () => { if (ytStream) ytStream.destroy(); });
    } catch (error) {
        if(!res.headersSent) res.status(500).end();
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CRITIXO ACTIVE ON PORT ${PORT}`);
});

module.exports = app;
