import fs from "fs";

export default function cleanup(tempFiles: string[]) {
  tempFiles.forEach((file) => {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });
};