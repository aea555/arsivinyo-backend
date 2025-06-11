import path from "path";
import { fileURLToPath } from "url";

export function getBinaryPath(name: "yt-dlp" | "ffmpeg") {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) return name; // uses global binaries installed in container

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const executable = `${name}.exe`;

  return path.join(__dirname, "..", executable);
}
