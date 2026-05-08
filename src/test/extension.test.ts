import * as assert from 'assert';
import * as http from 'http';
import * as path from 'path';
import * as vscode from 'vscode';
import {
	getCurrentAccessCode,
	isServerRunning,
	startWebServer,
	stopWebServer
} from '../network';

type JsonHttpResponse = {
	statusCode: number;
	rawBody: string;
	body: Record<string, unknown> | null;
};

const workspaceRoot = path.resolve(__dirname, '..', '..');
const fakeExtensionContext = {
	asAbsolutePath(relativePath: string): string {
		return path.join(workspaceRoot, relativePath);
	}
} as unknown as vscode.ExtensionContext;

suite('Copilot Share Network Smoke Tests', function () {
	this.timeout(20000);

	setup(async () => {
		await stopWebServer();
	});

	teardown(async () => {
		await stopWebServer();
	});

	test('start/stop server lifecycle', async () => {
		const startResult = await startWebServer(fakeExtensionContext, { accessControlEnabled: true });

		assert.ok(startResult.localUrl.startsWith('http://127.0.0.1:'), 'server should expose a local URL');
		assert.strictEqual(startResult.accessControlEnabled, true, 'access control should be enabled');
		assert.strictEqual(isServerRunning().isRunning, true, 'server should be running after start');

		await stopWebServer();

		const runtimeState = isServerRunning();
		assert.strictEqual(runtimeState.isRunning, false, 'server should stop cleanly');
		assert.strictEqual(runtimeState.usedPort, null, 'server port should be cleared after stop');
	});

	test('access code verify endpoint accepts current access code', async () => {
		const startResult = await startWebServer(fakeExtensionContext, { accessControlEnabled: true });
		const accessCode = getCurrentAccessCode();

		const response = await requestJson(`${startResult.localUrl}/api/access-code/verify`, 'POST', {
			accessCode
		});

		assert.strictEqual(response.statusCode, 200, 'verify endpoint should accept current access code');
		assert.strictEqual(response.body?.ok, true, 'verify response should be ok');
	});

	test('protected chat endpoint rejects missing auth and accepts bearer access code', async () => {
		const startResult = await startWebServer(fakeExtensionContext, { accessControlEnabled: true });
		const endpoint = `${startResult.localUrl}/api/chat/reset`;

		const unauthorizedResponse = await requestJson(endpoint, 'POST', { clearAll: true });
		assert.strictEqual(unauthorizedResponse.statusCode, 401, 'protected endpoint should reject missing access code');

		const accessCode = getCurrentAccessCode();
		const authorizedResponse = await requestJson(
			endpoint,
			'POST',
			{ clearAll: true },
			{ Authorization: `Bearer ${accessCode}` }
		);

		assert.strictEqual(authorizedResponse.statusCode, 200, 'protected endpoint should accept valid bearer access code');
		assert.strictEqual(authorizedResponse.body?.cleared, true, 'authorized reset should return cleared=true');
	});
});

function requestJson(
	urlString: string,
	method: 'GET' | 'POST',
	payload?: Record<string, unknown>,
	headers: Record<string, string> = {}
): Promise<JsonHttpResponse> {
	const url = new URL(urlString);
	const rawPayload = payload ? JSON.stringify(payload) : '';
	const requestHeaders: Record<string, string> = {
		...headers
	};

	if (rawPayload) {
		requestHeaders['Content-Type'] = 'application/json';
		requestHeaders['Content-Length'] = String(Buffer.byteLength(rawPayload));
	}

	return new Promise<JsonHttpResponse>((resolve, reject) => {
		const request = http.request(
			{
				hostname: url.hostname,
				port: url.port,
				path: `${url.pathname}${url.search}`,
				method,
				headers: requestHeaders
			},
			(response) => {
				const chunks: Buffer[] = [];

				response.on('data', (chunk: Buffer | string) => {
					chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
				});

				response.on('end', () => {
					const rawBody = Buffer.concat(chunks).toString('utf8');
					let body: Record<string, unknown> | null = null;

					if (rawBody.trim().length > 0) {
						try {
							body = JSON.parse(rawBody) as Record<string, unknown>;
						} catch {
							body = null;
						}
					}

					resolve({
						statusCode: response.statusCode ?? 0,
						rawBody,
						body
					});
				});
			}
		);

		request.on('error', reject);

		if (rawPayload) {
			request.write(rawPayload);
		}

		request.end();
	});
}
