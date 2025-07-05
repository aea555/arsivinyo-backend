import fs from "fs";

export default function cleanup(tempFiles: string[]) {
  for (const file of tempFiles) {
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (err) {
      console.warn(`Cleanup failed for ${file}:`, err);
    }
  }
}
