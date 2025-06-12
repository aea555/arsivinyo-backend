import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import os from "os";
import runWithTimeout from "./runWithTimeout.js";
import { getBinaryPath } from "./getBinaryPath.js";
import { getCookiesPath } from "./getCookiesPath.js";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export default async function downloadHandler(req: Request, res: Response) {
  const { url } = req.body as { url: string };

  if (!url) {
    res.status(400).send("Eksik veri");
    return;
  }

  const sanitizedUrl = url.split("&")[0];
  const allowedDomains = [
    "youtube.com",
    "youtu.be",
    "x.com",
    "twitter.com",
    "instagram.com",
  ];
  const urlHost = new URL(sanitizedUrl).hostname;

  if (!allowedDomains.some((domain) => urlHost.includes(domain))) {
    res.status(400).send("URL is not from an allowed domain");
    return;
  }

  const timestamp = Date.now();
  const tempName = `video_${timestamp}`;
  const fileName = `arsivinyo_${timestamp}.mp4`;

  const tmpDir = os.tmpdir();
  const rawPath = path.join(tmpDir, `${tempName}_raw.mp4`);
  const cleanPath = path.join(tmpDir, `${tempName}_clean.mp4`);

  const ytDlp = getBinaryPath("yt-dlp");
  const ffmpeg = getBinaryPath("ffmpeg");

  const cookiesPath = getCookiesPath();
  const isYouTube = /youtube\.com|youtu\.be/.test(sanitizedUrl);
  const format = isYouTube
    ? '-f "bv*[ext=mp4][height<=480]+ba[ext=m4a]/b[ext=mp4][height<=480]"'
    : "-f best";

  const cookiesArg = isYouTube ? `--cookies "${cookiesPath}"` : "";

  const downloadCmd = `"${ytDlp}" ${cookiesArg} ${format} --no-cache-dir --no-mtime --no-playlist -o "${rawPath}" "${sanitizedUrl}"`;
  const ffmpegCmd = `"${ffmpeg}" -i "${rawPath}" -c copy -map_metadata -1 -metadata creation_time=now "${cleanPath}"`;

  const tempFiles = [rawPath, cleanPath];

  const cleanup = () => {
    tempFiles.forEach((file) => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    });
  };
  process.on("exit", cleanup);
  process.on("SIGINT", () => process.exit(0));
  process.on("SIGTERM", () => process.exit(0));
  process.on("uncaughtException", () => process.exit(1));

  try {
    await runWithTimeout(downloadCmd, 60_000, "yt-dlp");

    const stats = fs.statSync(rawPath);
    if (stats.size > MAX_FILE_SIZE) {
      fs.unlinkSync(rawPath);
      res.status(413).send("Dosya boyutu 100 MB sınırını aşıyor.");
      return;
    }

    await runWithTimeout(ffmpegCmd, 30_000, "ffmpeg");

    const buffer = fs.readFileSync(cleanPath);
    fs.unlinkSync(rawPath);
    fs.unlinkSync(cleanPath);

    res.set({
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": buffer.length.toString(),
      "Access-Control-Expose-Headers": "Content-Disposition",
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("Incoming download request:", url);
      console.log("Sanitized URL:", sanitizedUrl);
      console.log("Cookies path:", cookiesPath);
      console.log("yt-dlp path:", ytDlp);
      console.log("ffmpeg path:", ffmpeg);
      console.log("yt-dlp command:", downloadCmd);
      console.log("ffmpeg command:", ffmpegCmd);
    }

    res.send(buffer);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("❗ İndirme sırasında hata oluştu:", err);
    }
    res.status(500).send("İndirme sırasında hata oluştu.");
    return;
  }
}
