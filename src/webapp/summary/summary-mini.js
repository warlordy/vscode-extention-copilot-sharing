(function () {
	const contentEl = document.getElementById("summaryMiniContent");

	function applySnapshot(snapshot) {
		if (!contentEl) {
			return;
		}

		const sessionName = snapshot && typeof snapshot.sessionName === "string"
			? snapshot.sessionName
			: "Session";
		const contentHtml = snapshot && typeof snapshot.contentHtml === "string"
			? snapshot.contentHtml
			: '<div class="session-summary-empty">No summary available for this session yet.</div>';

		document.title = `${sessionName} Summary`;
		contentEl.innerHTML = contentHtml;
		contentEl.scrollLeft = 0;
		if (typeof window.requestAnimationFrame === "function") {
			window.requestAnimationFrame(() => {
				contentEl.scrollLeft = 0;
			});
		}
	}

	window.syncSummaryContent = function syncSummaryContent(snapshot) {
		applySnapshot(snapshot);
	};

	window.addEventListener("DOMContentLoaded", () => {
		if (!window.opener || typeof window.opener.getDetachedSummarySnapshot !== "function") {
			return;
		}

		try {
			const snapshot = window.opener.getDetachedSummarySnapshot();
			applySnapshot(snapshot);
		} catch {
			// Ignore opener-access failures from restricted contexts.
		}
	});
})();
