import { exec } from "child_process";

export default function runWithTimeout(cmd: string, timeoutMs: number, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`${label} error:\n${stderr}`);
        return reject(new Error(`${label} failed`));
      }
      resolve();
    });

    const timeout = setTimeout(() => {
      child.kill(); // force kill the process
      console.error(`${label} timed out`);
      reject(new Error(`${label} timed out`));
    }, timeoutMs);

    child.on("exit", () => clearTimeout(timeout));
  });
}
