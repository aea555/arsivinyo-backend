import fs from "fs";

export default function waitForFile(path: string, timeout = 5000, interval = 200): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (fs.existsSync(path)) return resolve();
      if (Date.now() - start > timeout) return reject(new Error("File not found in time"));
      setTimeout(check, interval);
    };
    check();
  });
}
