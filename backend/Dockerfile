FROM node:22-slim

# Python3 aur curl dono install karein (yt-dlp ko python chahiye)
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Work directory set karein
WORKDIR /app

# Package files copy karein
COPY package*.json ./

# Dependencies install karein
RUN npm install --no-package-lock

# Baqi sara code copy karein
COPY . .

# yt-dlp installation (latest version)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Port expose
EXPOSE 8000

# Start command
CMD ["node", "index.js"]
