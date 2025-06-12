import { exec } from "child_process";

export default function runWithTimeout(
  cmd: string,
  timeoutMs: number,
  label: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = exec(cmd, (error, stdout, stderr) => {
      if (process.env.NODE_ENV === "production") {
        console.log(`\n${label} STDOUT:\n${stdout}`);
        console.error(`\n${label} STDERR:\n${stderr}`);
      }

      if (error) {
        if (process.env.NODE_ENV === "production") {
          console.error(`${label} failed:\n${error}`);
        }
        return reject(new Error(`${label} failed`));
      }

      resolve();
    });

    const timeout = setTimeout(() => {
      child.kill();
      if (process.env.NODE_ENV === "production") {
        console.error(`${label} timed out`);
      }
      reject(new Error(`${label} timed out`));
    }, timeoutMs);

    child.on("exit", () => clearTimeout(timeout));
  });
}
