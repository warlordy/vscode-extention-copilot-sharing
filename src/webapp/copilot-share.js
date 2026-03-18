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

	function setMenuLabel(labelEl, value) {
		labelEl.textContent = value;
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
	}

	async function loadCopilotShareInfo() {
		try {
			const response = await fetch("/api/server-info");
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
			await navigator.clipboard.writeText(copyTarget);
			setMenuLabel(copyPublicUrlMenuLabelEl, "Copied");
			window.setTimeout(() => {
				setMenuLabel(copyPublicUrlMenuLabelEl, copyBtnName);
			}, 1200);
		} catch {
			setMenuLabel(copyPublicUrlMenuLabelEl, "Failed");
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
		if (event.key === "Escape") {
			closeMenu();
			copilotShareMenuBtnEl.focus();
		}
	});

	updateMenuActionState();
	closeMenu();
	return loadCopilotShareInfo();
}

window.initCopilotSharePanel = initCopilotSharePanel;
