import * as vscode from 'vscode';
import {
	getServerRuntimeState,
	isServerRunning,
	setServerStateChangeHandler,
	startWebServer,
	stopWebServer
} from './network';
import { createStatusBarUiController } from './ui';

const EXTENSION_NAME_FOR_UI = 'Copilot Share';
const OPEN_MENU_COMMAND = 'copilot-sharing.open-control-menu';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "copilot-sharing" is now active!');

	const uiController = createStatusBarUiController({
		context,
		extensionNameForUi: EXTENSION_NAME_FOR_UI,
		openMenuCommand: OPEN_MENU_COMMAND,
		isServerRunning,
		getServerRuntimeState: () => getServerRuntimeState(EXTENSION_NAME_FOR_UI),
		startWebServer: () => startWebServer(context),
		stopWebServer
	});

	setServerStateChangeHandler(() => {
		uiController.refresh();
	});

	context.subscriptions.push(uiController);
	context.subscriptions.push(
		new vscode.Disposable(() => {
			setServerStateChangeHandler(undefined);
			void stopWebServer();
		})
	);
}

export async function deactivate() {
	setServerStateChangeHandler(undefined);
	await stopWebServer();
}
