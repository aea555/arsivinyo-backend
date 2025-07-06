import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import os from "os";
import runWithTimeout from "./runWithTimeout.js";
import { getBinaryPath } from "./getBinaryPath.js";
import { getCookiesPath } from "./getCookiesPath.js";
import cleanup from "./cleanup.js";
import waitForFile from "./waitForFile.js"

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export default async function downloadHandler(req: Request, res: Response) {
  const isProduction = process.env.NODE_ENV === "production";
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

  // Force mp4 format for YouTube
  const format = isYouTube
    ? '-f "bv*[ext=mp4][protocol!=m3u8][height<=480]+ba[ext=m4a][protocol!=m3u8]/b[ext=mp4][protocol!=m3u8][height<=480]"'
    : "-f best";

  const fallbackFormat = isYouTube
    ? '-f "bv*[ext=mp4][height<=480]+ba[ext=m4a]/b[ext=mp4][height<=480]"'
    : "-f best";

  const cookiesArg = isYouTube ? `--cookies "${cookiesPath}"` : "";

  const downloadCmd = `"${ytDlp}" ${cookiesArg} ${format} --no-cache-dir --no-mtime --no-playlist -o "${rawPath}" "${sanitizedUrl}"`;
  const downloadCmdFallback = `"${ytDlp}" ${cookiesArg} ${fallbackFormat} --no-cache-dir --no-mtime --no-playlist -o "${rawPath}" "${sanitizedUrl}"`;
  const ffmpegCmd = `"${ffmpeg}" -i "${rawPath}" -c copy -map_metadata -1 -metadata creation_time=now "${cleanPath}"`;
  const ffmpegRemuxCmd = `"${ffmpeg}" -y -fflags +genpts -i "${rawPath}" -c copy -map_metadata -1 -metadata creation_time=now "${cleanPath}"`;
  const ffmpegReencodeCmd = `"${ffmpeg}" -y -i "${rawPath}" -map_metadata -1 -metadata creation_time=now -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k "${cleanPath}"`;

  const tempFiles = [rawPath, cleanPath];

  try {
    const DOWNLOAD_TIMEOUT = isProduction ? 5 * 60_000 : 2 * 60_000;
    const DOWNLOAD_TIMEOUT_FALLBACK = isProduction ? 7.5 * 60_000 : 3 * 60_000;

    try {
      await runWithTimeout(downloadCmd, DOWNLOAD_TIMEOUT, "yt-dlp");
    } catch (err) {
      console.warn("Primary yt-dlp command failed, trying fallback format...");
      try {
        await runWithTimeout(downloadCmdFallback, DOWNLOAD_TIMEOUT_FALLBACK, "yt-dlp fallback");
      } catch (fallbackErr) {
        console.error("Both yt-dlp commands failed:", fallbackErr);
        res.status(500).send("İndirme başarısız oldu (yt-dlp).");
        return;
      }
    }

    await waitForFile(rawPath)
    const stats = fs.statSync(rawPath);
    if (stats.size > MAX_FILE_SIZE) {
      fs.unlinkSync(rawPath);
      res.status(413).send("Dosya boyutu 100 MB sınırını aşıyor.");
      return;
    }

    try {
      await runWithTimeout(ffmpegCmd, 30_000, "ffmpeg");
    } catch (remuxErr) {
      console.warn("Remuxing failed, trying re-encoding...");
      try {
        await runWithTimeout(ffmpegRemuxCmd, 60_000, "ffmpeg");
      } catch (reencodeErr) {
        console.warn("Overwrite remux failed, trying full re-encoding...");
        try {
          await runWithTimeout(ffmpegReencodeCmd, 120_000, "ffmpeg");
        } catch (finalErr) {
          console.error("Re-encoding failed:", finalErr);
          res.status(500).send("FFmpeg işlemi başarısız oldu.");
          return;
        }
      }
    }

    const buffer = fs.readFileSync(cleanPath);

    res.set({
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": buffer.length.toString(),
      "Access-Control-Expose-Headers": "Content-Disposition",
    });

    if (!isProduction) {
      console.log("Incoming download request:", url);
      console.log("Sanitized URL:", sanitizedUrl);
      console.log("Cookies path:", cookiesPath);
      console.log("yt-dlp path:", ytDlp);
      console.log("ffmpeg path:", ffmpeg);
      console.log("yt-dlp command:", downloadCmd);
      console.log("ffmpeg remux command:", ffmpegRemuxCmd);
      console.log("ffmpeg reencoding command:", ffmpegReencodeCmd);
    }

    res.send(buffer);
  } catch (err) {
    if (!isProduction) {
      console.error("❗ İndirme sırasında hata oluştu:", err);
    }
    res.status(500).send("İndirme sırasında hata oluştu.");
    return;
  } finally {
    cleanup(tempFiles);
  }
}
