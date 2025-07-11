import path from "path";
import { fileURLToPath } from "url";

export function getCookiesPath(): string {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // In production, assuming cookies.txt is in the working directory
    return path.join(process.cwd(), "cookies.txt");
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, "..", "..", "cookies.txt");
}
