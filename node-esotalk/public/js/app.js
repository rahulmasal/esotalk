/* ──────────────────────────────────────────────
   Keyboard Shortcuts for esoTalk Plus
   ──────────────────────────────────────────────
   Ctrl+K / Cmd+K  → Focus search bar
   Ctrl+Enter       → Submit focused form
   Escape           → Close modals / popups
   ────────────────────────────────────────────── */

document.addEventListener('keydown', (e) => {
    // Ctrl+K / Cmd+K → Jump to search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[name="q"]');
        if (searchInput) {
            searchInput.focus();
        } else {
            window.location = '/search';
        }
    }

    // Ctrl+Enter → Submit active form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.form) {
            activeEl.form.submit();
        }
    }

    // Escape → Close modals
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal, .popup');
        modals.forEach(m => m.style.display = 'none');
    }
});

// ──────────────────────────────────────────────
// Auto-save Drafts (fires every 30 seconds)
// ──────────────────────────────────────────────
(function() {
    const textarea = document.querySelector('textarea[name="content"]');
    const titleInput = document.querySelector('input[name="title"]');
    if (!textarea) return;

    let lastSaved = '';
    setInterval(() => {
        const content = textarea.value;
        if (content && content !== lastSaved) {
            lastSaved = content;
            const data = { content };
            if (titleInput) data.title = titleInput.value;
            
            fetch('/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(r => r.json()).then(d => {
                if (d.success) console.log('Draft auto-saved');
            }).catch(() => {});
        }
    }, 30000);
})();

// ──────────────────────────────────────────────
// Register Service Worker for PWA
// ──────────────────────────────────────────────
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
}
