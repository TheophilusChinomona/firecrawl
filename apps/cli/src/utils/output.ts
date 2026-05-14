/**
 * Output utility for writing results to stdout or file
 */
import * as fs from 'fs';

export function writeOutput(content: string, filePath?: string, silent?: boolean): void {
  if (filePath) {
    fs.writeFileSync(filePath, content, 'utf-8');
    if (!silent) {
      process.stderr.write(`Output written to ${filePath}\n`);
    }
  } else {
    process.stdout.write(content + '\n');
  }
}
