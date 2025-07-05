import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

export function getBinaryPath(name: "yt-dlp" | "ffmpeg") {
  const isProduction = process.env.NODE_ENV === "production";
  const executable = process.platform === "win32" ? `${name}.exe` : name;

  if (isProduction) return executable; // uses global binaries installed in container

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const localBinaryPath = path.join(__dirname, "..", executable);

  if (fs.existsSync(localBinaryPath)) {
    return localBinaryPath;
  }

  return executable;
}
