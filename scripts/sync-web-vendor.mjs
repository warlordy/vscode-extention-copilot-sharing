import { mkdir, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

const projectRoot = process.cwd();
const vendorDir = path.join(projectRoot, 'src', 'webapp', 'vendor');

const filesToCopy = [
	{
		source: path.join(projectRoot, 'node_modules', 'marked', 'lib', 'marked.umd.js'),
		target: path.join(vendorDir, 'marked.umd.js')
	},
	{
		source: path.join(projectRoot, 'node_modules', 'dompurify', 'dist', 'purify.min.js'),
		target: path.join(vendorDir, 'purify.min.js')
	},
	{
		source: path.join(projectRoot, 'node_modules', 'highlight.js', 'styles', 'github-dark.min.css'),
		target: path.join(vendorDir, 'highlight.github-dark.min.css')
	},
	{
		source: path.join(projectRoot, 'node_modules', 'github-markdown-css', 'github-markdown.css'),
		target: path.join(vendorDir, 'github-markdown.css')
	},
	{
		source: path.join(projectRoot, 'node_modules', 'jszip', 'dist', 'jszip.min.js'),
		target: path.join(vendorDir, 'jszip.min.js')
	}
];

async function syncVendorAssets() {
	await mkdir(vendorDir, { recursive: true });

	for (const file of filesToCopy) {
		await copyFile(file.source, file.target);
	}

	await build({
		entryPoints: [path.join(projectRoot, 'node_modules', 'highlight.js', 'lib', 'common.js')],
		bundle: true,
		format: 'iife',
		globalName: 'hljs',
		platform: 'browser',
		outfile: path.join(vendorDir, 'highlight.common.bundle.js')
	});

	await build({
		entryPoints: [path.join(projectRoot, 'node_modules', 'qrcode', 'lib', 'browser.js')],
		bundle: true,
		format: 'iife',
		globalName: 'QRCode',
		platform: 'browser',
		outfile: path.join(vendorDir, 'qrcode.min.js'),
		minify: true
	});

	await rm(path.join(vendorDir, 'highlight.common.js'), { force: true });
	console.log('[sync-web-vendor] vendor assets updated');
}

syncVendorAssets().catch((error) => {
	console.error('[sync-web-vendor] failed:', error);
	process.exitCode = 1;
});
