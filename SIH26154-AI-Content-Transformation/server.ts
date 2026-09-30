import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import esbuild from 'esbuild';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const bundledServer = path.join(distDir, 'server.js');

async function bootstrap() {
  fs.mkdirSync(distDir, { recursive: true });
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'server-core.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    outfile: bundledServer,
  });
  await import(pathToFileURL(bundledServer).href);
}

bootstrap().catch((error) => {
  console.error('[SIH26154 Content Transformation] Server bootstrap failed:', error);
  process.exit(1);
});
