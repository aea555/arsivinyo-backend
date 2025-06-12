# Use official Node.js LTS image
FROM node:20

# Set working directory
WORKDIR /app

# Install ffmpeg and yt-dlp 
RUN apt-get update && \
  apt-get install -y ffmpeg curl && \
  curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
  -o /usr/local/bin/yt-dlp && \
  chmod +x /usr/local/bin/yt-dlp

# Copy project files
COPY . .

# Install dependencies and build
RUN npm install
RUN npm run build

# Expose port (Render uses env.PORT)
EXPOSE 3001

# Arg for local testing
ARG AUTH_TOKEN

ENV NODE_ENV=production
ENV AUTH_TOKEN=$AUTH_TOKEN

# Start the app
CMD ["node", "dist/server.js"]