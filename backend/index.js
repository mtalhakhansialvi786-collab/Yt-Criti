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

const rawCookiesPath = path.join(__dirname, 'cookies.txt');
const cleanCookiesPath = path.join(__dirname, 'clean_cookies.txt');

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
    } catch (e) { console.error("Cookie processing error:", e); }
    return false;
};

const hasCookies = fixAndGetCookies();

app.get('/health', (req, res) => res.json({ 
    status: 'online', 
    engine: 'Critixo-Ultra-V9.5-Final-Bypass', 
    cookies_valid: hasCookies,
    uptime: process.uptime()
}));

app.get('/video-info', async (req, res) => {
    const videoURL = req.query.url;
    if(!videoURL) return res.status(400).send("URL required");

    try {
        let args = [
            videoURL, 
            '--no-playlist', 
            '--no-check-certificates',
            '--no-warnings',
            '--user-agent', 'com.google.android.youtube/19.29.37 (Linux; U; Android 11; en_US; Pixel 4 XL; Build/RP1A.200720.009)',
            '--extractor-args', 'youtube:player_client=android;player_skip_subscribe_check=True',
            '--geo-bypass'
        ];

        // 💡 AGAR IP BLOCK HAI TO YAHAN PROXY ADD KAREIN
        // args.push('--proxy', 'http://aapka_proxy_ip:port');

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
            details: "Your Server IP is flagged by YouTube as a Bot. Cookies alone are not enough.",
            solution: "Use a Proxy or OAuth2. Check Koyeb logs for more info."
        });
    }
});

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
        '--extractor-args', 'youtube:player_client=android'
    ]; 

    // args.push('--proxy', 'http://aapka_proxy_ip:port');

    if(hasCookies) {
        args.push('--cookies', cleanCookiesPath);
    }

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
        req.on('close', () => { if (ytStream) ytStream.destroy(); });
    } catch (error) {
        if(!res.headersSent) res.status(500).end();
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CRITIXO ULTRA V9.5 ACTIVE ON PORT ${PORT}`);
});

module.exports = app;
