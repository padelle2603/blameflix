import { build, context } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const version = pkg.version;
const watch = process.argv.includes('--watch');

// Targeted cleanup only: www/index.backup.html must never be touched.
rmSync('www/js', { recursive: true, force: true });
rmSync('www/css', { recursive: true, force: true });
mkdirSync('www/js', { recursive: true });
mkdirSync('www/css', { recursive: true });

const jsOptions = {
    entryPoints: ['src/js/app.js'],
    bundle: true,
    format: 'esm',
    splitting: true,
    target: ['es2020'],
    outdir: 'www/js',
    define: { __BLAMEFLIX_VERSION__: JSON.stringify(version) },
    legalComments: 'inline',
    minify: true,
    logLevel: 'info'
};

const cssOptions = {
    entryPoints: ['src/css/main.css'],
    bundle: true,
    outfile: 'www/css/styles.css',
    minify: true,
    loader: { '.woff2': 'file' },
    logLevel: 'info'
};

function copyStatic() {
    cpSync('src/index.html', 'www/index.html');
    for (const asset of ['favicon.png', 'tmdb.svg']) {
        cpSync(`src/assets/${asset}`, `www/${asset}`);
    }
    cpSync('src/assets/fonts', 'www/fonts', { recursive: true });
}

if (watch) {
    const [jsCtx, cssCtx] = await Promise.all([context(jsOptions), context(cssOptions)]);
    copyStatic();
    await Promise.all([jsCtx.watch(), cssCtx.watch()]);
    console.log(`BlameFlix web build watching for changes (v${version})...`);
} else {
    await Promise.all([build(jsOptions), build(cssOptions)]);
    copyStatic();
    console.log(`BlameFlix web build complete (v${version}) -> www/`);
}
