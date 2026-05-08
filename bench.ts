import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pixelmatch from 'pixelmatch';
import * as blazediffMod from '@blazediff/core';
import { PNG } from 'pngjs';
import { Bench, hrtimeNow } from 'tinybench';

type DiffFn = (
  img1: Uint8Array | Buffer,
  img2: Uint8Array | Buffer,
  output: Uint8Array | Buffer | null | undefined,
  width: number,
  height: number,
  options?: { threshold?: number },
) => number;

const blazediff: DiffFn =
  (blazediffMod as any).default ?? (blazediffMod as any).diff ?? (blazediffMod as any);

const VIEWPORTS = ['1280x720', '1920x1080', '3840x2160'];
const FIXTURES_DIR = join(__dirname, 'fixtures');

function loadPng(path: string): { data: Buffer; width: number; height: number } {
  const png = PNG.sync.read(readFileSync(path));
  return { data: png.data, width: png.width, height: png.height };
}

async function benchViewport(name: string) {
  const dir = join(FIXTURES_DIR, name);
  const baselinePath = join(dir, 'baseline.png');
  const currentPath = join(dir, 'current.png');

  if (!existsSync(baselinePath) || !existsSync(currentPath)) {
    console.warn(`[skip] ${name}: fixtures missing — run \`npm run capture\` first.`);
    return;
  }

  const a = loadPng(baselinePath);
  const b = loadPng(currentPath);

  if (a.width !== b.width || a.height !== b.height) {
    console.warn(
      `[skip] ${name}: dimension mismatch (${a.width}x${a.height} vs ${b.width}x${b.height}).`,
    );
    return;
  }

  const w = a.width;
  const h = a.height;
  const opts = { threshold: 0.1 };

  const pmDiff = pixelmatch(a.data, b.data, undefined, w, h, opts);
  const bdDiff = blazediff(a.data, b.data, undefined, w, h, opts);
  if (pmDiff === 0 || bdDiff === 0) {
    console.warn(
      `[warn] ${name}: comparator returned 0 diff pixels (pixelmatch=${pmDiff}, blazediff=${bdDiff}). The fastBufferCheck early-out may have fired — overlay step likely failed.`,
    );
  }

  const bench = new Bench({
    iterations: 50,
    warmupIterations: 5,
    time: 0,
    now: hrtimeNow,
  });

  bench
    .add('pixelmatch', () => {
      pixelmatch(a.data, b.data, undefined, w, h, opts);
    })
    .add('blazediff', () => {
      blazediff(a.data, b.data, undefined, w, h, opts);
    });

  await bench.run();

  console.log(`\n=== ${name} (${w}x${h}, diff pixels: pixelmatch=${pmDiff} blazediff=${bdDiff}) ===`);
  const rows = bench.tasks.map((t) => {
    const r = t.result!;
    return {
      name: t.name,
      'ops/s': r.throughput.mean.toFixed(1),
      'avg ms': (r.latency.mean ?? 0).toFixed(2),
      'min ms': (r.latency.min ?? 0).toFixed(2),
      'max ms': (r.latency.max ?? 0).toFixed(2),
      samples: r.latency.samples.length,
    };
  });
  console.table(rows);

  const pm = bench.tasks.find((t) => t.name === 'pixelmatch')!.result!;
  const bd = bench.tasks.find((t) => t.name === 'blazediff')!.result!;
  const speedup = pm.latency.mean! / bd.latency.mean!;
  console.log(`blazediff is ${speedup.toFixed(2)}x faster than pixelmatch on ${name}.`);
}

(async () => {
  for (const v of VIEWPORTS) {
    await benchViewport(v);
  }
})();
