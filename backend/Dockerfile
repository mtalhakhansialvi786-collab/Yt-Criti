FROM node:22-slim

# Install curl for yt-dlp
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Force install (ignore lock files)
RUN npm install

# Copy all files
COPY . .

# Run postinstall manually to get yt-dlp
RUN npm run postinstall

# Expose port
EXPOSE 8000

# Start app
CMD ["npm", "start"]
