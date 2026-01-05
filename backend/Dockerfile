FROM node:22-slim

# Install curl for yt-dlp
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Sab se pehle package files copy karein
COPY package*.json ./

# Install dependencies (lock file ke baghair)
RUN npm install --no-package-lock

# Baqi sara code copy karein
COPY . .

# yt-dlp ko manually install karein taake script ka error na aaye
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp

# Port expose karein
EXPOSE 8000

# App start karein
CMD ["node", "index.js"]
