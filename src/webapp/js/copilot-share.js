const ACCESS_CODE_STORAGE_KEY = "copilot-share-access-code";
let accessCodePromptState = null;
let accessCodeResolveInFlightPromise = null;

function readStoredAccessCode() {
	try {
		const value = window.localStorage.getItem(ACCESS_CODE_STORAGE_KEY);
		return typeof value === "string" ? value.trim() : "";
	} catch {
		return "";
	}
}

function storeAccessCode(accessCode) {
	const normalized = String(accessCode || "").trim();
	if (!normalized) {
		return;
	}

	try {
		window.localStorage.setItem(ACCESS_CODE_STORAGE_KEY, normalized);
	} catch {
		// Ignore storage failures; auth still works for current request.
	}
}

function clearStoredAccessCode() {
	try {
		window.localStorage.removeItem(ACCESS_CODE_STORAGE_KEY);
	} catch {
		// Ignore storage failures.
	}
}

async function verifyAccessCode(accessCode) {
	const response = await fetch("/api/access-code/verify", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ accessCode: String(accessCode || "").trim() })
	});

	if (!response.ok) {
		return false;
	}

	const data = await response.json().catch(() => ({}));
	return data?.ok === true;
}

function ensureAccessCodePromptElements() {
	if (accessCodePromptState) {
		return accessCodePromptState;
	}

	const overlay = document.createElement("div");
	overlay.className = "access-code-modal-overlay";
	overlay.hidden = true;

	const dialog = document.createElement("div");
	dialog.className = "access-code-modal";
	dialog.setAttribute("role", "dialog");
	dialog.setAttribute("aria-modal", "true");
	dialog.setAttribute("aria-labelledby", "accessCodeDialogTitle");

	const title = document.createElement("h2");
	title.id = "accessCodeDialogTitle";
	title.className = "access-code-modal-title";
	title.textContent = "Enter Access Code";

	const hint = document.createElement("p");
	hint.className = "access-code-modal-hint";
	hint.textContent = "This LAN session is protected. Ask the host for the Copilot Share access code.";

	const input = document.createElement("input");
	input.type = "password";
	input.className = "access-code-modal-input";
	input.placeholder = "Access code";
	input.autocomplete = "off";
	input.spellcheck = false;

	const error = document.createElement("div");
	error.className = "access-code-modal-error";
	error.hidden = true;

	const actions = document.createElement("div");
	actions.className = "access-code-modal-actions";

	const cancelBtn = document.createElement("button");
	cancelBtn.type = "button";
	cancelBtn.className = "access-code-modal-cancel";
	cancelBtn.textContent = "Cancel";

	const submitBtn = document.createElement("button");
	submitBtn.type = "button";
	submitBtn.className = "access-code-modal-submit";
	submitBtn.textContent = "Unlock";

	actions.append(cancelBtn, submitBtn);
	dialog.append(title, hint, input, error, actions);
	overlay.append(dialog);
	document.body.append(overlay);

	accessCodePromptState = {
		overlay,
		dialog,
		input,
		error,
		cancelBtn,
		submitBtn,
		promptResolver: null
	};

	return accessCodePromptState;
}

function closeAccessCodePrompt(resolveValue) {
	const state = ensureAccessCodePromptElements();
	state.overlay.hidden = true;
	state.error.hidden = true;
	state.error.textContent = "";
	state.input.value = "";
	const resolver = state.promptResolver;
	state.promptResolver = null;
	if (typeof resolver === "function") {
		resolver(resolveValue);
	}
}

function showAccessCodePrompt(errorMessage = "") {
	const state = ensureAccessCodePromptElements();
	if (state.promptResolver) {
		state.error.hidden = !errorMessage;
		state.error.textContent = errorMessage;
		state.input.focus();
		return new Promise((resolve) => {
			const previousResolve = state.promptResolver;
			state.promptResolver = (value) => {
				if (typeof previousResolve === "function") {
					previousResolve(value);
				}
				resolve(value);
			};
		});
	}

	state.overlay.hidden = false;
	state.input.value = "";
	state.error.hidden = !errorMessage;
	state.error.textContent = errorMessage;

	const onOverlayClick = (event) => {
		if (event.target === state.overlay) {
			cleanup();
			closeAccessCodePrompt(null);
		}
	};

	const onKeyDown = (event) => {
		if (event.key === "Escape") {
			event.preventDefault();
			cleanup();
			closeAccessCodePrompt(null);
			return;
		}

		if (event.key === "Enter") {
			event.preventDefault();
			const value = state.input.value.trim();
			if (!value) {
				state.error.hidden = false;
				state.error.textContent = "Access code is required.";
				return;
			}
			cleanup();
			closeAccessCodePrompt(value);
		}
	};

	const onCancel = () => {
		cleanup();
		closeAccessCodePrompt(null);
	};

	const onSubmit = () => {
		const value = state.input.value.trim();
		if (!value) {
			state.error.hidden = false;
			state.error.textContent = "Access code is required.";
			return;
		}

		cleanup();
		closeAccessCodePrompt(value);
	};

	const cleanup = () => {
		state.overlay.removeEventListener("click", onOverlayClick);
		window.removeEventListener("keydown", onKeyDown, true);
		state.cancelBtn.removeEventListener("click", onCancel);
		state.submitBtn.removeEventListener("click", onSubmit);
	};

	state.overlay.addEventListener("click", onOverlayClick);
	window.addEventListener("keydown", onKeyDown, true);
	state.cancelBtn.addEventListener("click", onCancel);
	state.submitBtn.addEventListener("click", onSubmit);

	window.setTimeout(() => {
		state.input.focus();
		state.input.select();
	}, 0);

	return new Promise((resolve) => {
		state.promptResolver = resolve;
	});
}

async function resolveAccessCode({ forcePrompt = false } = {}) {
	let accessCode = forcePrompt ? "" : readStoredAccessCode();

	if (accessCode) {
		const isValid = await verifyAccessCode(accessCode).catch(() => false);
		if (isValid) {
			return accessCode;
		}
		clearStoredAccessCode();
		accessCode = "";
	}

	let latestErrorMessage = "";
	while (!accessCode) {
		const userAccessCode = await showAccessCodePrompt(latestErrorMessage);
		if (!userAccessCode) {
			throw new Error("Authentication canceled.");
		}

		const isValid = await verifyAccessCode(userAccessCode).catch(() => false);
		if (isValid) {
			storeAccessCode(userAccessCode);
			return userAccessCode;
		}

		latestErrorMessage = "Invalid access code. Please try again.";
	}

	return accessCode;
}

async function ensureAccessCode({ forcePrompt = false } = {}) {
	if (accessCodeResolveInFlightPromise) {
		return accessCodeResolveInFlightPromise;
	}

	const resolvePromise = resolveAccessCode({ forcePrompt });
	accessCodeResolveInFlightPromise = resolvePromise;

	try {
		return await resolvePromise;
	} finally {
		if (accessCodeResolveInFlightPromise === resolvePromise) {
			accessCodeResolveInFlightPromise = null;
		}
	}
}

async function copilotShareAuthFetch(resource, init = {}, options = {}) {
	const shouldRequireAuth = options.requireAuth !== false;
	const shouldRetryOnUnauthorized = options.retryOnUnauthorized !== false;

	const baseInit = {
		...init,
		headers: new Headers(init?.headers || {})
	};

	if (!shouldRequireAuth) {
		return fetch(resource, baseInit);
	}

	const storedAccessCode = readStoredAccessCode();
	if (storedAccessCode) {
		baseInit.headers.set("Authorization", `Bearer ${storedAccessCode}`);
	}

	let response = await fetch(resource, baseInit);
	if (response.status !== 401 || !shouldRetryOnUnauthorized) {
		return response;
	}

	clearStoredAccessCode();

	accessCode = await ensureAccessCode({ forcePrompt: true });
	const retryInit = {
		...init,
		headers: new Headers(init?.headers || {})
	};
	retryInit.headers.set("Authorization", `Bearer ${accessCode}`);
	response = await fetch(resource, retryInit);
	return response;
}

window.copilotShareAuthFetch = copilotShareAuthFetch;
window.copilotShareEnsureAccessCode = ensureAccessCode;

// === Favicon hover popup for collapsed sidebar ===
document.addEventListener("DOMContentLoaded", () => {
	const faviconEl = document.getElementById("copilotShareFavicon");
	const appEl = document.getElementById("app");
	let popupEl = null;
	if (!faviconEl || !appEl) {
		return;
	}

	function showFaviconPopup() {
		if (!appEl.classList.contains("sidebar-collapsed")) {
			return;
		}
		if (!popupEl) {
			popupEl = document.createElement("div");
			popupEl.className = "session-hover-float";
			document.body.appendChild(popupEl);
		}
		popupEl.innerHTML =
			'<div class="session-hover-title">Copilot Share</div>' +
			'<div class="session-hover-text">Make Copilot Web for Everyone</div>';
		const rect = faviconEl.getBoundingClientRect();
		const popupWidth = 220;
		const popupHalfHeight = 38;
		const minTop = 8;
		const maxTop = window.innerHeight - popupHalfHeight - 8;
		const left = Math.min(rect.right + 10, window.innerWidth - popupWidth - 8);
		const top = Math.max(minTop, Math.min(rect.top + rect.height / 2 - popupHalfHeight, maxTop));
		popupEl.style.left = `${left}px`;
		popupEl.style.top = `${top}px`;
		popupEl.hidden = false;
		popupEl.classList.add("show");
	}

	function hideFaviconPopup() {
		if (popupEl) {
			popupEl.classList.remove("show");
			popupEl.hidden = true;
		}
	}

	faviconEl.addEventListener("mouseenter", showFaviconPopup);
	faviconEl.addEventListener("mouseleave", hideFaviconPopup);
});
function initCopilotSharePanel() {
	const copilotShareBoxEl = document.getElementById("copilotShareBox");
	const copilotShareMenuBtnEl = document.getElementById("copilotShareMenuBtn");
	const copilotShareMenuEl = document.getElementById("copilotShareMenu");
	const copyPublicUrlMenuItemEl = document.getElementById("copyPublicUrlMenuItem");
	const openPublicUrlMenuItemEl = document.getElementById("openPublicUrlMenuItem");
	const copyPublicUrlMenuLabelEl = document.getElementById("copyPublicUrlMenuLabel");
	const openPublicUrlMenuLabelEl = document.getElementById("openPublicUrlMenuLabel");

	if (!copilotShareBoxEl || !copilotShareMenuBtnEl || !copilotShareMenuEl || !copyPublicUrlMenuItemEl || !openPublicUrlMenuItemEl || !copyPublicUrlMenuLabelEl || !openPublicUrlMenuLabelEl) {
		return Promise.resolve();
	}

	let currentPublicUrl = "";
	let publicUrlQrPopupState = null;

	function ensurePublicUrlQrPopupElements() {
		if (publicUrlQrPopupState) {
			return publicUrlQrPopupState;
		}

		const overlay = document.createElement("div");
		overlay.className = "public-url-qr-modal-overlay";
		overlay.hidden = true;

		const dialog = document.createElement("div");
		dialog.className = "public-url-qr-modal";
		dialog.setAttribute("role", "dialog");
		dialog.setAttribute("aria-modal", "true");
		dialog.setAttribute("aria-labelledby", "publicUrlQrDialogTitle");

		const title = document.createElement("h2");
		title.id = "publicUrlQrDialogTitle";
		title.className = "public-url-qr-modal-title";
		title.textContent = "Public URL Ready for Local Network (LAN) Use";

		const copiedHintList = document.createElement("ul");
		copiedHintList.className = "public-url-qr-modal-bullet-list";
		const copiedHintItem = document.createElement("li");
		copiedHintItem.textContent = "Public URL copied successfully";
		copiedHintList.append(copiedHintItem);

		const scanHintList = document.createElement("ul");
		scanHintList.className = "public-url-qr-modal-bullet-list";
		const scanHintItem = document.createElement("li");
		scanHintItem.textContent = "You can also scan this QR code to open it.";
		scanHintList.append(scanHintItem);

		const qrImage = document.createElement("img");
		qrImage.className = "public-url-qr-modal-image";
		qrImage.alt = "Public URL QR code";
		qrImage.width = 152;
		qrImage.height = 152;

		const qrFallback = document.createElement("div");
		qrFallback.className = "public-url-qr-modal-fallback";
		qrFallback.textContent = "Unable to load QR image. You can still use the copied URL below.";
		qrFallback.hidden = true;

		const urlValue = document.createElement("div");
		urlValue.className = "public-url-qr-modal-url";

		const closeBtn = document.createElement("button");
		closeBtn.type = "button";
		closeBtn.className = "public-url-qr-modal-close";
		closeBtn.textContent = "Close";

		dialog.append(title, copiedHintList, urlValue, scanHintList, qrImage, qrFallback, closeBtn);
		overlay.append(dialog);
		document.body.append(overlay);

		publicUrlQrPopupState = {
			overlay,
			dialog,
			qrImage,
			qrFallback,
			urlValue,
			closeBtn,
			cleanup: null
		};

		return publicUrlQrPopupState;
	}

	function closePublicUrlQrPopup() {
		const state = ensurePublicUrlQrPopupElements();
		if (typeof state.cleanup === "function") {
			state.cleanup();
		}
		state.overlay.hidden = true;
	}

	function showPublicUrlQrPopup(publicUrl) {
		const targetUrl = String(publicUrl || "").trim();
		if (!targetUrl) {
			return;
		}

		const state = ensurePublicUrlQrPopupElements();
		if (typeof state.cleanup === "function") {
			state.cleanup();
		}

		const qrSource = `https://api.qrserver.com/v1/create-qr-code/?size=152x152&data=${encodeURIComponent(targetUrl)}`;
		state.qrFallback.hidden = true;
		state.qrImage.hidden = false;
		state.urlValue.textContent = targetUrl;

		const onImageError = () => {
			state.qrImage.hidden = true;
			state.qrFallback.hidden = false;
		};

		const onImageLoad = () => {
			state.qrFallback.hidden = true;
			state.qrImage.hidden = false;
		};

		const onOverlayClick = (event) => {
			if (event.target === state.overlay) {
				closePublicUrlQrPopup();
			}
		};

		const onKeyDown = (event) => {
			if (event.key !== "Escape" || event.defaultPrevented || state.overlay.hidden) {
				return;
			}
			event.preventDefault();
			closePublicUrlQrPopup();
		};

		const onClose = () => {
			closePublicUrlQrPopup();
		};

		state.qrImage.addEventListener("error", onImageError, { once: true });
		state.qrImage.addEventListener("load", onImageLoad, { once: true });
		state.overlay.addEventListener("click", onOverlayClick);
		window.addEventListener("keydown", onKeyDown, true);
		state.closeBtn.addEventListener("click", onClose);

		state.cleanup = () => {
			state.qrImage.removeEventListener("error", onImageError);
			state.qrImage.removeEventListener("load", onImageLoad);
			state.overlay.removeEventListener("click", onOverlayClick);
			window.removeEventListener("keydown", onKeyDown, true);
			state.closeBtn.removeEventListener("click", onClose);
			state.cleanup = null;
		};

		state.qrImage.src = qrSource;
		state.overlay.hidden = false;
		window.setTimeout(() => {
			state.closeBtn.focus();
		}, 0);
	}

	function setMenuLabel(labelEl, value) {
		labelEl.textContent = value;
	}

	async function copyTextWithFallback(value) {
		const text = String(value || "");
		if (!text) {
			return false;
		}

		if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
			try {
				await navigator.clipboard.writeText(text);
				return true;
			} catch {
				// Continue to legacy fallback for mobile and restricted contexts.
			}
		}

		try {
			const textArea = document.createElement("textarea");
			textArea.value = text;
			textArea.setAttribute("readonly", "");
			textArea.setAttribute("aria-hidden", "true");
			textArea.style.position = "fixed";
			textArea.style.top = "0";
			textArea.style.left = "0";
			textArea.style.opacity = "0";
			document.body.append(textArea);
			textArea.focus();
			textArea.select();
			textArea.setSelectionRange(0, textArea.value.length);
			const copied = document.execCommand("copy");
			document.body.removeChild(textArea);
			return copied;
		} catch {
			return false;
		}
	}

	function updateMenuActionState() {
		const hasLanUrl = Boolean(String(currentPublicUrl || "").trim());
		copyPublicUrlMenuItemEl.disabled = !hasLanUrl;
		setMenuLabel(copyPublicUrlMenuLabelEl, "Copy Public URL");
		copyPublicUrlMenuItemEl.title = hasLanUrl ? "Copy public URL" : "Public URL unavailable";

		openPublicUrlMenuItemEl.disabled = !hasLanUrl;
		setMenuLabel(openPublicUrlMenuLabelEl, "Open Public URL");
		openPublicUrlMenuItemEl.title = hasLanUrl ? "Open public URL" : "Public URL unavailable";
	}

	function closeMenu() {
		copilotShareMenuEl.hidden = true;
		copilotShareMenuBtnEl.setAttribute("aria-expanded", "false");
	}

	function toggleMenu() {
		const shouldOpen = copilotShareMenuEl.hidden;
		copilotShareMenuEl.hidden = !shouldOpen;
		copilotShareMenuBtnEl.setAttribute("aria-expanded", String(shouldOpen));
		if (shouldOpen && typeof window.requestMenuPopupClamp === "function") {
			window.requestMenuPopupClamp();
		}
	}

	async function loadCopilotShareInfo() {
		try {
			const response = await window.copilotShareAuthFetch("/api/server-info");
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const data = await response.json();
			const lanUrl = Array.isArray(data.lanUrls) && data.lanUrls.length > 0 ? String(data.lanUrls[0]) : "";

			currentPublicUrl = lanUrl;
			updateMenuActionState();
		} catch {
			currentPublicUrl = "";
			updateMenuActionState();
		}
	}

	copilotShareMenuBtnEl.addEventListener("click", () => {
		toggleMenu();
	});

	copyPublicUrlMenuItemEl.addEventListener("click", async () => {
		const copyBtnName = "Copy Public URL";
		const copyTarget = String(currentPublicUrl || "").trim();
		if (!copyTarget) {
			return;
		}

		try {
			const copied = await copyTextWithFallback(copyTarget);
			if (copied) {
				setMenuLabel(copyPublicUrlMenuLabelEl, "Copied");
			} else {
				setMenuLabel(copyPublicUrlMenuLabelEl, "Copy failed");
			}
			showPublicUrlQrPopup(copyTarget);
			window.setTimeout(() => {
				setMenuLabel(copyPublicUrlMenuLabelEl, copyBtnName);
			}, 1200);
		} catch {
			showPublicUrlQrPopup(copyTarget);
			setMenuLabel(copyPublicUrlMenuLabelEl, "Copy failed");
			window.setTimeout(() => {
				setMenuLabel(copyPublicUrlMenuLabelEl, copyBtnName);
			}, 1200);
		}

		closeMenu();
	});

	openPublicUrlMenuItemEl.addEventListener("click", () => {
		const openBtnName = "Open Public URL";
		const targetUrl = String(currentPublicUrl || "").trim();
		if (!targetUrl) {
			return;
		}

		const openedWindow = window.open(targetUrl, "_blank", "noopener,noreferrer");
		if (openedWindow) {
			setMenuLabel(openPublicUrlMenuLabelEl, "Opened");
		} else {
			setMenuLabel(openPublicUrlMenuLabelEl, "Blocked");
		}
		window.setTimeout(() => {
			setMenuLabel(openPublicUrlMenuLabelEl, openBtnName);
		}, 1200);

		closeMenu();
	});

	document.addEventListener("click", (event) => {
		const target = event.target;
		if (!(target instanceof Node)) {
			return;
		}
		if (copilotShareBoxEl.contains(target)) {
			return;
		}
		closeMenu();
	});

	document.addEventListener("keydown", (event) => {
		if (event.key !== "Escape" || event.defaultPrevented) {
			return;
		}

		if (copilotShareMenuEl.hidden) {
			return;
		}

		closeMenu();
		copilotShareMenuBtnEl.focus();
	});

	updateMenuActionState();
	closeMenu();
	return loadCopilotShareInfo();
}

window.initCopilotSharePanel = initCopilotSharePanel;
