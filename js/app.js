// Main application logic for Biscit
document.addEventListener('DOMContentLoaded', () => {
    console.log('Biscit app loaded.');

    // --- Tab Switching ---
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');

    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tab = link.dataset.tab;
            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            link.classList.add('active');
            document.getElementById(tab).classList.add('active');
        });
    });

    // --- Home Tab Logic ---
    const currentUrlInput = document.getElementById('current-url');
    const addCookiesBtn = document.getElementById('home-add-cookies');
    const deleteCookiesBtn = document.getElementById('home-delete-cookies');
    const importCookiesBtn = document.getElementById('home-import-cookies');
    const exportCookiesBtn = document.getElementById('home-export-cookies');
    const autoSyncToggle = document.getElementById('home-auto-sync-toggle');

    // Get current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
            currentUrlInput.value = tabs[0].url;
        }
    });

    addCookiesBtn.addEventListener('click', () => {
        alert('Add/Edit Cookies button clicked for ' + currentUrlInput.value);
    });

    deleteCookiesBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all cookies for this page?')) {
            alert('Deleting cookies for ' + currentUrlInput.value);
        }
    });

    importCookiesBtn.addEventListener('click', () => {
        alert('Import Cookies button clicked for ' + currentUrlInput.value);
    });

    exportCookiesBtn.addEventListener('click', () => {
        alert('Export Cookies button clicked for ' + currentUrlInput.value);
    });

    autoSyncToggle.addEventListener('change', () => {
        alert('Auto Sync toggled to ' + autoSyncToggle.checked);
    });

});
