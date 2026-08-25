import { build, context } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

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
    // Cache-bust: the entry script is versioned by its content hash so the
    // browser always fetches a fresh build, and the HTML is marked no-cache
    // so debugging locally never serves a stale bundle.
    const appJs = readFileSync('www/js/app.js', 'utf8');
    const hash = createHash('md5').update(appJs).digest('hex').slice(0, 8);
    let html = readFileSync('www/index.html', 'utf8')
        .replace('src="js/app.js"', `src="js/app.js?h=${hash}"`)
        .replace('<head>', '<head>\n  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">');
    writeFileSync('www/index.html', html);
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
