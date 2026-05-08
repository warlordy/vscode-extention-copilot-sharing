import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJsonPath = path.join(workspaceRoot, 'package.json');
const changelogPath = path.join(workspaceRoot, 'CHANGELOG.md');

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const version = String(packageJson.version || '').trim();
const expectedTag = `v${version}`;

const tagFromArg = process.argv[2]?.trim();
const tagFromEnv = process.env.RELEASE_TAG?.trim() || process.env.GITHUB_REF_NAME?.trim();
const detectedTag = tagFromArg || tagFromEnv || detectGitTag();

if (!version) {
	throw new Error('package.json version is missing.');
}

if (!detectedTag) {
	throw new Error(
		`No release tag found. Expected ${expectedTag}. Pass one with \"npm run release:check-tag -- ${expectedTag}\" or set RELEASE_TAG.`
	);
}

if (detectedTag !== expectedTag) {
	throw new Error(`Release tag mismatch. Expected ${expectedTag}, got ${detectedTag}.`);
}

const changelog = readFileSync(changelogPath, 'utf8');
const changelogContainsVersion =
	changelog.includes(`## [${version}]`) ||
	changelog.includes(`## ${version}`) ||
	changelog.includes(`## v${version}`) ||
	changelog.includes(`## [v${version}]`);

if (!changelogContainsVersion) {
	throw new Error(`CHANGELOG.md is missing a section for version ${version}.`);
}

console.log(`[release-check] tag OK: ${detectedTag}`);
console.log(`[release-check] changelog includes version: ${version}`);

function detectGitTag() {
	try {
		return execSync('git describe --tags --exact-match HEAD', {
			cwd: workspaceRoot,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		}).trim();
	} catch {
		return '';
	}
}
