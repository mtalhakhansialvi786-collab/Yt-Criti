FROM node:22-slim

# Install curl for yt-dlp
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Work directory set karein
WORKDIR /app

# Sab se pehle package files copy karein
# Yahan hum current directory se files utha rahe hain
COPY package*.json ./

# Dependencies install karein
RUN npm install --no-package-lock

# Baqi sara code copy karein (index.js wagera)
COPY . .

# yt-dlp installation
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Port expose
EXPOSE 8000

# Start command (check karein ke file ka naam index.js hi hai)
CMD ["node", "index.js"]
