import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workerSrc = resolve(
  __dirname,
  '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
);

GlobalWorkerOptions.workerSrc = workerSrc;
