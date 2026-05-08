# playwright-blazediff-bench

Benchmark Playwright's bundled `pixelmatch` against [`@blazediff/core`](https://www.npmjs.com/package/@blazediff/core) on real screenshots of [blazediff.dev](https://blazediff.dev).

## Layout

- `capture.spec.ts` — Playwright test that captures `baseline.png` + `current.png` at 1280×720, 1920×1080, 3840×2160. A 2×2 px overlay is injected before the second screenshot to defeat both libraries' identical-buffer fast paths.
- `bench.ts` — tinybench harness. Decodes the captured PNGs once and times `pixelmatch` vs `@blazediff/core`. **Primary measurement.**
- `patch.js` + `pixelmatch-shim.cjs` — `--require` preload that intercepts `playwright-core/lib/third_party/pixelmatch.js` by resolved-path suffix and returns the blazediff function instead.
- `screenshot.spec.ts` — `expect(page).toHaveScreenshot()` per viewport. Runs in vanilla mode or under the patch.

## Run

```sh
npm install
npm run install:browsers
npm run capture   # writes 6 PNGs to fixtures/
npm run bench     # tinybench tables, one per viewport
```
End-to-end swap demo (wall-clock is dominated by browser launch — see `bench.ts` for the meaningful timings):

```sh
npx playwright test screenshot.spec.ts --update-snapshots   # seed once
npm run bench:original    # vanilla pixelmatch
npm run bench:blazediff   # patched: prints `[patch] Playwright bundled pixelmatch -> @blazediff/core`
```

## Results

Apples-to-apples on real captures of blazediff.dev (50 iterations, 5 warmup, `threshold: 0.1`):

| Capture                  | pixelmatch | @blazediff/core | speedup |
|--------------------------|-----------:|----------------:|--------:|
| 1280×720                 |    4.16 ms |         1.93 ms |   2.15× |
| 1920×1080                |    8.88 ms |         4.41 ms |   2.01× |
| 3840×2160                |   36.38 ms |        19.21 ms |   1.89× |
| fullPage 3840×3335 (4K)  |   56.37 ms |        26.14 ms |   2.16× |

## Notes

- `@blazediff/core`'s CJS module exposes both `default` and `diff`; `bench.ts` resolves defensively (`m.default ?? m.diff ?? m`).
- Playwright vendors pixelmatch at `playwright-core/lib/third_party/pixelmatch.js` and requires it by relative path, so the patch intercepts by resolved filename suffix, not by bare specifier.
- `cross-env NODE_OPTIONS="--require ./patch.js"` propagates the preload to Playwright worker subprocesses.
- The `[patch]` log fires multiple times because Playwright spawns several Node subprocesses (parent + workers).
