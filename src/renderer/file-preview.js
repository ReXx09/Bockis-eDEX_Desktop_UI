(() => {
  async function showFilePreview(item) {
    if (!item || item.isDirectory) return;
    try {
      const preview = await window.edex.readFilePreview(item.path);
      const modal = document.createElement("div");
      modal.className = "modal_popup info file-preview-modal";
      const body = preview.kind === "image"
        ? `<img class="file-preview-image" src="data:${preview.mime};base64,${preview.data}" alt="${escapeHtml(item.name || "Vorschau")}">`
        : `<pre class="file-preview-text">${escapeHtml(preview.text || "")}</pre>`;
      modal.innerHTML = `
        <h2>Vorschau: ${escapeHtml(item.name || "")}</h2>
        <div class="file-preview-content">${body}</div>
        <div class="modal-actions"><button type="button" data-preview-close>Schließen</button></div>`;
      document.body.appendChild(modal);
      placeCentered(modal, { width: Math.min(900, window.innerWidth * 0.8) });
      modal.querySelector("[data-preview-close]")?.addEventListener("click", () => modal.remove());
      modal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") modal.remove();
      });
      modal.tabIndex = 0;
      modal.focus();
    } catch (err) {
      toast(err.message || "Vorschau nicht möglich");
    }
  }

  window.edexFilePreview = { showFilePreview };
})();
