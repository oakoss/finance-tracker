import { paraglideVitePlugin } from '@inlang/paraglide-js';
import posthog from '@posthog/rollup-plugin';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { varlockVitePlugin } from '@varlock/vite-integration';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import evlog from 'evlog/nitro/v3';
import { nitro } from 'nitro/vite';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import killerInstincts from 'vite-plugin-killer-instincts';

type RollupPlugin = ReturnType<typeof posthog>;

const projectDir = path.dirname(fileURLToPath(import.meta.url));

const isProduction = process.env.NODE_ENV === 'production';

/**
 * The PostHog plugin runs `posthog-cli sourcemap process` which
 * deletes each `.map` file after it successfully uploads. If you
 * flip this to `false`, also remove `deleteSourcemapsIn` from the
 * non-fatal wrapper below — otherwise a wrapper failure will
 * delete maps you meant to keep.
 */
const POSTHOG_DELETES_SOURCEMAPS_AFTER_UPLOAD = true;

type CleanupResult = {
  deleted: number;
  failures: { error: Error; file: string }[];
};

/**
 * Walks a build output directory and unlinks every `.map` file it
 * finds. The wrapper around the PostHog plugin calls this when the
 * upload fails, because `build.sourcemap: 'hidden'` has already
 * emitted the files and the plugin's own `deleteAfterUpload` never
 * ran. Leaving them in place would ship full source to the Docker
 * image via `COPY --from=build /app/.output`.
 *
 * Best-effort: attempts every file and collects per-file failures.
 * Bailing on the first failure would leave the remaining `.map`
 * files on disk — the exact leak we're trying to prevent.
 */
async function deleteSourcemapsIn(dir: string): Promise<CleanupResult> {
  const result: CleanupResult = { deleted: 0, failures: [] };
  const entries = await fs.readdir(dir, {
    recursive: true,
    withFileTypes: true,
  });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.map')) continue;
    const file = path.join(entry.parentPath, entry.name);
    try {
      await fs.unlink(file);
      result.deleted += 1;
    } catch (error) {
      result.failures.push({
        error: error instanceof Error ? error : new Error(String(error)),
        file,
      });
    }
  }
  return result;
}

/**
 * Wraps a Rollup/Vite plugin so errors from its `writeBundle` hook
 * become warnings instead of build failures. The PostHog plugin
 * has no `errorHandler` option (unlike `@sentry/vite-plugin`), so
 * without this wrapper a transient sourcemap upload outage would
 * block CI or a Coolify deploy.
 *
 * Set `STRICT_SOURCEMAPS=1` to disable the wrapper for a one-off
 * build. Use this during initial Coolify setup to see the real
 * CLI error text (persistent auth failures otherwise look
 * identical to transient outages in the wrapped warning).
 */
function nonFatalWriteBundle(plugin: RollupPlugin): RollupPlugin {
  const { writeBundle } = plugin;
  if (
    !writeBundle ||
    typeof writeBundle !== 'object' ||
    !('handler' in writeBundle) ||
    typeof writeBundle.handler !== 'function'
  ) {
    return plugin;
  }
  const original = writeBundle.handler;
  return {
    ...plugin,
    writeBundle: {
      ...writeBundle,
      async handler(...args: Parameters<typeof original>) {
        try {
          await original.apply(this, args);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          // `build.sourcemap: 'hidden'` has already written .map
          // files to disk. The PostHog plugin was supposed to
          // delete them after uploading, but we caught its error
          // before that cleanup ran. If we just swallow the
          // error, the Docker image ships full source via
          // COPY --from=build. Clean up ourselves or re-throw if
          // we can't — this case must fail loudly, not warn.
          const [options] = args;
          // Don't fall back to `path.dirname('')` which returns '.'
          // (the project root). Treat a missing output dir as a
          // hard failure — we have nowhere safe to sweep.
          const outputDir =
            options?.dir ??
            (options?.file ? path.dirname(options.file) : undefined);
          if (!outputDir) {
            throw new Error(
              `[${plugin.name}] writeBundle failed (${message}) and no ` +
                `output dir was available to clean up .map files. ` +
                `Refusing to continue to avoid shipping sourcemaps.`,
              { cause: error },
            );
          }
          // Defense-in-depth: only sweep paths inside the project
          // tree. A misbehaving plugin setting `options.dir` to
          // something like '.' or '/tmp' would otherwise let us
          // recursively unlink `.map` files outside `.output/`.
          const resolvedDir = path.resolve(outputDir);
          if (
            resolvedDir === projectDir ||
            !resolvedDir.startsWith(projectDir + path.sep)
          ) {
            throw new Error(
              `[${plugin.name}] writeBundle failed (${message}) and ` +
                `refusing to sweep .map files from ${resolvedDir} ` +
                `(outside project dir ${projectDir}).`,
              { cause: error },
            );
          }
          let result: CleanupResult;
          try {
            result = await deleteSourcemapsIn(resolvedDir);
          } catch (cleanupError) {
            // readdir itself failed — the directory is gone or
            // unreadable. Chain both errors so the operator sees
            // the full story.
            throw new AggregateError(
              [error, cleanupError],
              `[${plugin.name}] writeBundle failed (${message}) and ` +
                `sourcemap cleanup could not start on ${resolvedDir}. ` +
                `Refusing to continue to avoid shipping sourcemaps.`,
              { cause: cleanupError },
            );
          }
          if (result.failures.length > 0) {
            // Per-file unlink failures — we attempted every file
            // but some remain on disk. Re-throw with the upload
            // error, the cleanup errors, and a concrete count so
            // incident response knows what leaked.
            throw new AggregateError(
              [error, ...result.failures.map((f) => f.error)],
              `[${plugin.name}] writeBundle failed (${message}). ` +
                `Deleted ${result.deleted} .map file(s) but could not ` +
                `delete ${result.failures.length} more (first: ` +
                `${result.failures[0]?.file}). Refusing to continue to ` +
                `avoid shipping sourcemaps.`,
              { cause: error },
            );
          }
          console.warn(
            `[${plugin.name}] writeBundle failed (non-fatal): ${message}. ` +
              `Deleted ${result.deleted} orphaned .map file(s) from ${resolvedDir} ` +
              `to prevent source leak. Set STRICT_SOURCEMAPS=1 to see the ` +
              `underlying CLI error.`,
          );
        }
      },
    },
  };
}

/**
 * Builds the PostHog sourcemap plugin, or announces why it isn't
 * running. This project never wants a silent skip — if the gate
 * drops the plugin, the build log says so explicitly.
 */
function posthogPlugin(): RollupPlugin[] {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!apiKey || !projectId) {
    console.info(
      '[posthog] skipping sourcemap upload — POSTHOG_PERSONAL_API_KEY ' +
        'and POSTHOG_PROJECT_ID not set. (Set both in Coolify build-time ' +
        'env vars to enable.)',
    );
    return [];
  }
  const plugin = posthog({
    personalApiKey: apiKey,
    projectId,
    sourcemaps: {
      deleteAfterUpload: POSTHOG_DELETES_SOURCEMAPS_AFTER_UPLOAD,
      enabled: isProduction,
    },
  });
  return [
    process.env.STRICT_SOURCEMAPS === '1'
      ? plugin
      : nonFatalWriteBundle(plugin),
  ];
}

export default defineConfig({
  build: { sourcemap: 'hidden', target: 'es2023' },
  nitro: {
    // Replace `varlock/env` in the server bundle with our
    // process.env-backed shim. See src/lib/varlock-env-shim.ts for
    // the full reasoning. The client bundle is unaffected because
    // this alias only applies to the Nitro server build; on the
    // client the varlock vite plugin still statically inlines
    // `@public` values at build time.
    alias: {
      'varlock/env': path.resolve(projectDir, 'src/lib/varlock-env-shim.ts'),
    },
    experimental: { tasks: true },
    modules: [
      evlog({
        env: { service: 'finance-tracker' },
        // Exclude noisy internal, static, and high-frequency auth paths
        exclude: [
          '/_src/**',
          '/__manifest',
          '/favicon.ico',
          '/@vite/**',
          '/@fs/**',
          '/node_modules/**',
          '/api/auth/get-session',
        ],
        sampling: {
          // Always keep error responses (4xx/5xx) and slow requests
          keep: [{ status: 400 }, { status: 500 }, { duration: 3000 }],
          rates: {
            // debug off in production
            debug: isProduction ? 0 : 100,
            error: 100,
            // 10% info sampling in production; always kept in development
            info: isProduction ? 10 : 100,
            warn: 100,
          },
        },
      }),
    ],
    plugins: ['./src/lib/logging/drain.ts'],
    scheduledTasks: { '0 * * * *': ['purge-deleted-accounts'] },
    tasks: {
      'purge-deleted-accounts': {
        description: 'Hard-deletes accounts past the 7-day grace period.',
        handler: path.resolve(
          projectDir,
          'src/tasks/purge-deleted-accounts.ts',
        ),
      },
    },
  },
  plugins: [
    devtools(),
    killerInstincts({ autoKill: true }),
    varlockVitePlugin({ ssrInjectMode: 'auto-load' }),
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
    paraglideVitePlugin({
      cookieName: 'APP_LOCALE',
      outdir: './src/paraglide',
      project: './project.inlang',
      strategy: ['cookie', 'preferredLanguage', 'baseLocale'],
    }),
    // Sourcemap upload: enabled when Coolify mounts POSTHOG_* as
    // BuildKit secrets (see Dockerfile) or when a dev sets them
    // as env vars locally. CI workflows intentionally do not pass
    // them — see docs/development/logging.md for the full pipeline.
    ...posthogPlugin(),
  ],
  resolve: { tsconfigPaths: true },
  server: { port: Number(process.env.PORT ?? 3000), strictPort: true },
});
