import { useState, useEffect } from 'react'
import axios from 'axios'

// Aapka Live Koyeb Backend URL
const API_BASE_URL = "https://striped-philomena-critixo-labs-c21e960e.koyeb.app";

function App() {
  const [url, setUrl] = useState('')
  const [videoInfo, setVideoInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [downloads, setDownloads] = useState([])

  const playSuccessSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.4;
    audio.play().catch(e => console.log("Sound enabled."));
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (url.includes('youtube.com/') || url.includes('youtu.be/')) {
        getInfo(url);
      }
    }, 1200); 
    return () => clearTimeout(delayDebounceFn);
  }, [url]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      getInfo(text);
    } catch (err) {
      alert("Clipboard access chahiye!");
    }
  };

  const getInfo = async (targetUrl) => {
    if (!targetUrl) return;
    setLoading(true);
    setVideoInfo(null);
    try {
      // Localhost ki jagah Live URL use kiya gaya hai
      const res = await axios.get(`${API_BASE_URL}/video-info?url=${encodeURIComponent(targetUrl)}`);
      setVideoInfo(res.data);
    } catch (err) {
      console.error("Invalid Link or Backend Offline");
    }
    setLoading(false);
  }

  const startDownload = async (type) => {
    const downloadId = Date.now();
    const fileName = videoInfo?.clean_name || "Video";
    
    setDownloads(prev => [{ 
      id: downloadId,
      title: videoInfo?.title || "Stream Task", 
      progress: 0, 
      speed: 'Turbo Linking...', 
      received: '0 MB', 
      total: videoInfo?.filesize_formatted || "Dynamic",
      status: 'Downloading'
    }, ...prev]);

    try {
      const response = await axios({
        // Localhost ki jagah Live URL use kiya gaya hai
        url: `${API_BASE_URL}/download?url=${encodeURIComponent(url)}&type=${type}&title=${encodeURIComponent(fileName)}`,
        method: 'GET',
        responseType: 'blob',
        onDownloadProgress: (p) => {
          let percent = Math.floor((p.loaded * 100) / (p.total || videoInfo?.filesize_raw || 100000000));
          setDownloads(prev => prev.map(dl => 
            dl.id === downloadId ? { 
              ...dl, 
              progress: percent > 100 ? 99 : percent, 
              received: (p.loaded / 1048576).toFixed(1) + ' MB'
            } : dl
          ));
        }
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${fileName}_Critixo.${type.includes('audio') ? 'mp3' : 'mp4'}`;
      a.click();
      playSuccessSound();
      setDownloads(prev => prev.map(dl => dl.id === downloadId ? { ...dl, status: 'Completed', progress: 100 } : dl));
    } catch (err) {
      console.error("Download Error:", err);
      setDownloads(prev => prev.map(dl => dl.id === downloadId ? { ...dl, status: 'Failed' } : dl));
    }
  };

  const Skeleton = () => (
    <div style={ui.skeletonCard}>
      <div style={ui.skeletonThumb}></div>
      <div style={ui.skeletonInfo}>
        <div style={ui.skeletonLine}></div>
        <div style={{...ui.skeletonLine, width: '60%'}}></div>
        <div style={ui.skeletonBtnGrid}><div style={ui.skeletonBtn}></div><div style={ui.skeletonBtn}></div></div>
      </div>
    </div>
  );

  return (
    <div style={ui.body}>
      <nav style={ui.navbar}>
        <div style={ui.navContent}>
          <div style={ui.logo}>CRITIXO <span style={{color:'#fff', fontSize:'0.7rem', border:'1px solid #f00', padding:'2px 5px', borderRadius:'4px', marginLeft:'5px'}}>ULTRA V9.5</span></div>
          <div style={ui.navLinks}>
            <a href="#benefits" style={ui.navLink}>Benefits</a>
            <a href="#how" style={ui.navLink}>How to Use</a>
            <a href="#contact" style={ui.navLink}>Support</a>
            <span style={ui.statusBadge}>SERVER: ONLINE</span>
          </div>
        </div>
      </nav>

      <div style={ui.main}>
        <div style={{textAlign:'center', marginBottom:'40px'}}>
           <h1 style={{fontSize:'2.5rem', fontWeight:'900', background:'linear-gradient(to right, #fff, #666)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>NEXT-GEN DOWNLOADER</h1>
           <p style={{color:'#555', marginTop:'10px'}}>Youtube videos download karein ultra fast speed ke sath.</p>
        </div>

        <div style={ui.searchWrapper}>
          <button onClick={handlePaste} style={ui.pasteBtn}>PASTE LINK</button>
          <input 
            type="text" placeholder="YouTube URL yahan paste karein..." value={url}
            onChange={(e) => setUrl(e.target.value)} style={ui.input}
          />
          <button onClick={() => getInfo(url)} style={ui.searchBtn}>
            {loading ? "ANALYZING..." : "START"}
          </button>
        </div>

        <div style={ui.contentGrid}>
          <div style={ui.card}>
            <h3 style={ui.cardTitle}>ACTIVE STREAMS ({downloads.length})</h3>
            {downloads.length === 0 && <p style={{color:'#222', textAlign:'center', fontSize:'0.8rem'}}>No active tasks</p>}
            {downloads.map(dl => (
              <div key={dl.id} style={ui.taskItem}>
                <div style={ui.taskHead}><span>{dl.title.substring(0,25)}..</span><span>{dl.progress}%</span></div>
                <div style={ui.progressBase}><div style={{...ui.progressFill, width: `${dl.progress}%`}}></div></div>
                <div style={ui.taskBottom}><span style={{color: '#0f0'}}>{dl.status}</span><span>{dl.received} / {dl.total}</span></div>
              </div>
            ))}
          </div>

          <div style={ui.previewSection}>
            {loading && <Skeleton />}
            {videoInfo && (
              <div style={ui.previewCard}>
                <img src={videoInfo.thumbnail} style={ui.thumb} alt="thumb" />
                <div style={ui.infoContent}>
                  <h4 style={ui.videoTitle}>{videoInfo.title}</h4>
                  <div style={{display:'flex', gap:'10px'}}>
                    <div style={ui.sizeBadge}>SIZE: {videoInfo.filesize_formatted}</div>
                    <div style={{...ui.sizeBadge, background:'#00f2', color:'#44f'}}>DURATION: {videoInfo.duration}</div>
                  </div>
                  <div style={ui.actionGrid}>
                    <button onClick={() => startDownload('hd')} style={ui.btnW}>1080P MP4</button>
                    <button onClick={() => startDownload('360p')} style={ui.btnG}>360P</button>
                    <button onClick={() => startDownload('audio')} style={ui.btnR}>MP3 320K</button>
                    <button onClick={() => startDownload('128k')} style={ui.btnR}>MP3 128K</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer style={ui.footer}>
        <div style={ui.footerContent}>
          <div style={ui.footerSection}>
            <div style={ui.logo}>CRITIXO <span>V9.5</span></div>
            <p style={ui.footerPara}>Critixo Ultra duniya ka fastest YouTube meta-engine hai jo high-quality video aur audio extraction ko support karta hai. Hamara mission user ko baghair kisi ad ke premium downloading experience dena hai.</p>
            <div style={ui.socialIcons}>
              <a href="#" style={ui.icon}>FB</a>
              <a href="#" style={ui.icon}>IG</a>
              <a href="#" style={ui.icon}>YT</a>
            </div>
          </div>

          <div id="how" style={ui.footerSection}>
            <h4 style={ui.footerHeading}>HOW TO DOWNLOAD</h4>
            <ul style={ui.footerList}>
              <li><span>1</span> YouTube se link copy karein.</li>
              <li><span>2</span> "PASTE LINK" button dabaein.</li>
              <li><span>3</span> Engine auto-analyze karega.</li>
              <li><span>4</span> Format select karein aur download start!</li>
            </ul>
          </div>

          <div id="benefits" style={ui.footerSection}>
            <h4 style={ui.footerHeading}>ULTRA BENEFITS</h4>
            <ul style={ui.footerList}>
              <li>⚡ Turbo Streaming Technology</li>
              <li>🎵 320kbps Crystal Clear Audio</li>
              <li>🎥 4K & Full HD Support</li>
              <li>🛡️ No Ads & No Tracking</li>
              <li>📋 One-Click Auto Paste</li>
            </ul>
          </div>

          <div id="contact" style={ui.footerSection}>
            <h4 style={ui.footerHeading}>GET IN TOUCH</h4>
            <p style={ui.footerPara}>Koi masla ho toh rabta karein:</p>
            <div style={ui.contactBox}>
              <div style={ui.contactItem}>📞 +92 344 8665265</div>
              <div style={ui.contactItem}>📧 support@critixo.ultra</div>
              <div style={ui.contactItem}>📍 Karachi, Pakistan</div>
            </div>
            <div style={{marginTop:'15px'}}>
              <a href="#" style={ui.footerLink}>Privacy Policy</a> | <a href="#" style={ui.footerLink}>Terms</a>
            </div>
          </div>
        </div>

        <div style={ui.footerBottom}>
          © 2026 CRITIXO ULTRA V9.5 | Crafted for Professional Speed.
        </div>
      </footer>

      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        html { scroll-behavior: smooth; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}

const ui = {
  body: { backgroundColor: '#000', color: '#fff', minHeight: '100vh', fontFamily: "'Inter', sans-serif" },
  navbar: { borderBottom: '1px solid #111', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 1000 },
  navContent: { maxWidth: '1200px', margin: '0 auto', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontWeight: '900', color: '#f00', fontSize: '1.4rem', letterSpacing: '-1px' },
  navLinks: { display: 'flex', gap: '25px', alignItems: 'center' },
  navLink: { color: '#888', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '500', transition: '0.3s' },
  statusBadge: { fontSize: '0.65rem', background: '#0f02', color: '#0f0', padding: '4px 10px', borderRadius: '20px', border: '1px solid #0f04' },
  main: { maxWidth: '1100px', margin: '0 auto', padding: '60px 20px' },
  searchWrapper: { display: 'flex', background: '#0a0a0a', padding: '10px', borderRadius: '16px', border: '1px solid #1a1a1a', marginBottom: '60px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' },
  pasteBtn: { background: '#1a1a1a', color: '#fff', border: 'none', padding: '0 20px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' },
  input: { flex: 1, background: 'transparent', border: 'none', color: '#fff', padding: '15px', outline: 'none', fontSize: '1rem' },
  searchBtn: { background: '#f00', color: '#fff', border: 'none', padding: '0 30px', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 0 15px rgba(255,0,0,0.3)' },
  contentGrid: { display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '40px' },
  card: { background: '#050505', padding: '25px', borderRadius: '24px', border: '1px solid #111' },
  cardTitle: { fontSize: '0.75rem', color: '#555', letterSpacing: '3px', marginBottom: '25px', textAlign: 'center' },
  taskItem: { background: '#080808', padding: '18px', borderRadius: '16px', marginBottom: '15px', border: '1px solid #111' },
  taskHead: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '12px' },
  progressBase: { height: '6px', background: '#000', borderRadius: '10px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #f00, #ff4444)', boxShadow: '0 0 10px #f00' },
  taskBottom: { display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: '12px', color: '#444' },
  previewCard: { background: '#080808', borderRadius: '24px', overflow: 'hidden', border: '1px solid #1a1a1a', position: 'sticky', top: '100px' },
  thumb: { width: '100%', height: '280px', objectFit: 'cover', borderBottom: '1px solid #1a1a1a' },
  infoContent: { padding: '25px' },
  videoTitle: { fontSize: '1.2rem', marginBottom: '15px', fontWeight: '700', lineHeight: '1.4' },
  sizeBadge: { background: '#0f01', color: '#0f0', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' },
  actionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '25px' },
  btnW: { background: '#fff', color: '#000', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' },
  btnG: { background: '#1a1a1a', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', cursor: 'pointer' },
  btnR: { background: '#f00', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  footer: { background: '#050505', borderTop: '1px solid #111', padding: '80px 0 30px 0', marginTop: '100px' },
  footerContent: { maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '50px', padding: '0 25px' },
  footerSection: { display: 'flex', flexDirection: 'column', gap: '20px' },
  footerHeading: { fontSize: '0.9rem', fontWeight: '900', color: '#fff', letterSpacing: '1px', borderLeft: '3px solid #f00', paddingLeft: '10px' },
  footerPara: { color: '#666', fontSize: '0.85rem', lineHeight: '1.6' },
  footerList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' },
  footerLink: { color: '#444', textDecoration: 'none', fontSize: '0.8rem' },
  contactBox: { display: 'flex', flexDirection: 'column', gap: '10px' },
  contactItem: { fontSize: '0.85rem', color: '#888' },
  footerBottom: { textAlign: 'center', marginTop: '80px', paddingTop: '30px', borderTop: '1px solid #111', color: '#333', fontSize: '0.75rem' },
  socialIcons: { display: 'flex', gap: '15px' },
  icon: { width: '35px', height: '35px', background: '#111', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#fff', textDecoration: 'none' },
  skeletonCard: { background: '#050505', borderRadius: '24px', overflow: 'hidden', border: '1px solid #111' },
  skeletonThumb: { width: '100%', height: '280px', background: 'linear-gradient(90deg, #0a0a0a 25%, #151515 50%, #0a0a0a 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' },
  skeletonInfo: { padding: '25px' },
  skeletonLine: { height: '18px', background: '#111', marginBottom: '12px', borderRadius: '6px' },
  skeletonBtnGrid: { display: 'flex', gap: '12px', marginTop: '25px' },
  skeletonBtn: { flex: 1, height: '45px', background: '#111', borderRadius: '12px' },
};

export default App;
