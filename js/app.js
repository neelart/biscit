// Main UI logic for the Biscit popup (index.html)
document.addEventListener('DOMContentLoaded', () => {
    let isAdmin = false;
    let currentDomain = '';

    // --- Tab Switching ---
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    tabLinks.forEach(link => { /* ... */ }); // (logic is already there)

    // --- State & Initializers ---
    const checkAdminState = () => { /* ... */ };
    const initializeApp = async () => {
        await checkAdminState();
        updateRoleUI();
        initializeHomeTab();
        initializeWebsitesTab();
        initializeSettingsTab();
    };
    const updateRoleUI = () => { /* ... */ };

    // --- Home Tab ---
    const initializeHomeTab = () => { /* ... */ };

    // --- Websites Tab ---
    const websiteList = document.getElementById('website-list');
    const searchBar = document.getElementById('search-bar');
    const addSiteButton = document.getElementById('add-site-button');

    const renderWebsiteList = () => {
        chrome.storage.local.get(['websites'], (result) => {
            const websites = result.websites || [];
            const filterText = searchBar.value.toLowerCase();
            websiteList.innerHTML = '';
            const filteredWebsites = websites.filter(site => site.url.toLowerCase().includes(filterText));

            filteredWebsites.forEach(site => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${site.url}</span>
                    <div class="controls">
                        <label class="switch" title="Enable/Disable Auto Sync">
                            <input type="checkbox" class="list-sync-toggle" data-url="${site.url}" ${site.enabled ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                        <button class="control-btn list-edit-btn admin-only" data-url="${site.url}" title="Edit/Import Cookies">✏️</button>
                        <button class="control-btn list-delete-btn admin-only" data-url="${site.url}" title="Delete Site">🗑️</button>
                    </div>
                `;
                websiteList.appendChild(li);
            });
            updateRoleUI(); // Re-apply admin visibility after render
        });
    };

    const initializeWebsitesTab = () => {
        renderWebsiteList();
        searchBar.addEventListener('input', renderWebsiteList);

        addSiteButton.addEventListener('click', () => {
            const url = prompt("Enter website domain to add:", "example.com");
            if (url) {
                chrome.storage.local.get({ websites: [] }, (result) => {
                    const websites = result.websites;
                    if (!websites.some(site => site.url === url)) {
                        websites.push({ url: url, enabled: true });
                        chrome.storage.local.set({ websites }, renderWebsiteList);
                    } else {
                        alert('Website already in list.');
                    }
                });
            }
        });

        websiteList.addEventListener('click', (e) => {
            const url = e.target.dataset.url;
            if (!url) return;

            if (e.target.classList.contains('list-delete-btn')) {
                if (confirm(`Are you sure you want to delete ${url}?`)) {
                    chrome.storage.local.get({ websites: [] }, (result) => {
                        let websites = result.websites.filter(site => site.url !== url);
                        chrome.storage.local.set({ websites }, renderWebsiteList);
                    });
                }
            } else if (e.target.classList.contains('list-edit-btn')) {
                openModal(url);
            } else if (e.target.classList.contains('list-sync-toggle')) {
                chrome.storage.local.get({ websites: [] }, (result) => {
                    const site = result.websites.find(s => s.url === url);
                    if (site) {
                        site.enabled = e.target.checked;
                        chrome.storage.local.set({ websites: result.websites });
                    }
                });
            }
        });
    };

    // --- Settings Tab ---
    const initializeSettingsTab = () => {
        const logoutButton = document.getElementById('logout-button');
        const changePasswordButton = document.getElementById('change-password-button');
        const saveRemoteSyncButton = document.getElementById('save-remote-sync-button');
        const exportSyncFileButton = document.getElementById('export-sync-file-button');
        const remoteSyncEnabledCheckbox = document.getElementById('remote-sync-enabled');
        const remoteSyncUrlInput = document.getElementById('remote-sync-url');

        // Load existing settings
        chrome.storage.local.get('remoteSyncSettings', (result) => {
            if (result.remoteSyncSettings) {
                remoteSyncEnabledCheckbox.checked = result.remoteSyncSettings.enabled;
                remoteSyncUrlInput.value = result.remoteSyncSettings.url;
            }
        });

        logoutButton.addEventListener('click', () => {
            chrome.storage.session.set({ isAdminLoggedIn: false }, () => {
                isAdmin = false;
                updateRoleUI();
            });
        });

        changePasswordButton.addEventListener('click', () => { /* ... logic ... */ });
        saveRemoteSyncButton.addEventListener('click', () => { /* ... logic ... */ });

        exportSyncFileButton.addEventListener('click', () => {
            // Get all website data and all master cookies
            chrome.storage.local.get(null, (allData) => {
                const exportData = {
                    websites: allData.websites || [],
                };
                for (const key in allData) {
                    if (key.startsWith('master_cookies_')) {
                        exportData[key] = allData[key];
                    }
                }
                const json = JSON.stringify(exportData, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                chrome.downloads.download({ url: url, filename: 'biscit_sync.json', saveAs: true });
            });
        });
    };

    // --- Modal & Parsers ---
    // ... (all modal and cookie parsing logic from before) ...

    // --- STARTUP ---
    initializeApp();
});
// NOTE: I have stubbed out some of the logic for brevity,
// but will now write the full, final file.
