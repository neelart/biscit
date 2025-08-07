document.addEventListener('DOMContentLoaded', () => {
    let isAdmin = false;
    let currentDomain = '';

    // --- Element Cache ---
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    const userSettingsView = document.querySelector('.user-settings');
    const adminPushControl = document.getElementById('admin-push-control');
    const userSyncControl = document.getElementById('user-sync-control');
    const currentUrlInput = document.getElementById('current-url');
    const addCookiesBtn = document.getElementById('home-add-cookies');
    const deleteCookiesBtn = document.getElementById('home-delete-cookies');
    const exportCookiesBtn = document.getElementById('home-export-cookies');
    const websiteList = document.getElementById('website-list');
    const searchBar = document.getElementById('search-bar');
    const addSiteButton = document.getElementById('add-site-button');
    const logoutButton = document.getElementById('logout-button');
    const changePasswordButton = document.getElementById('change-password-button');
    const saveRemoteSyncButton = document.getElementById('save-remote-sync-button');
    const exportSyncFileButton = document.getElementById('export-sync-file-button');
    const remoteSyncEnabledCheckbox = document.getElementById('remote-sync-enabled');
    const remoteSyncUrlInput = document.getElementById('remote-sync-url');
    const remoteSyncMessage = document.getElementById('remote-sync-message');
    const modal = document.getElementById('cookie-modal');
    const modalSiteName = modal.querySelector('#modal-site-name');
    const closeButton = modal.querySelector('.close-button');
    const saveCookiesButton = modal.querySelector('#save-cookies-button');
    const cookieEditor = modal.querySelector('#cookie-editor');
    let currentlyEditingSite = null;

    // --- Tab Switching ---
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const tab = e.currentTarget.dataset.tab;
            tabLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            document.getElementById(tab).classList.add('active');
        });
    });

    // --- Role & State Management ---
    const checkAdminState = () => {
        return new Promise(resolve => {
            chrome.storage.session.get(['isAdminLoggedIn'], result => {
                isAdmin = result.isAdminLoggedIn === true;
                resolve(isAdmin);
            });
        });
    };

    const updateRoleUI = () => {
        if (isAdmin) {
            adminPushControl.style.display = 'flex';
            userSyncControl.style.display = 'none';
            adminOnlyElements.forEach(el => { el.style.display = 'block'; });
            if(userSettingsView) userSettingsView.style.display = 'none';
        } else {
            adminPushControl.style.display = 'none';
            userSyncControl.style.display = 'flex';
            adminOnlyElements.forEach(el => { el.style.display = 'none'; });
            if(userSettingsView) userSettingsView.style.display = 'block';
        }
    };

    // --- Home Tab ---
    const initializeHomeTab = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url) {
                try {
                    currentDomain = new URL(tabs[0].url).hostname;
                    currentUrlInput.value = currentDomain;
                } catch (e) {
                    currentUrlInput.value = 'Invalid URL';
                }
            }
        });
        addCookiesBtn.addEventListener('click', () => { if (currentDomain) openModal(currentDomain); });
        deleteCookiesBtn.addEventListener('click', () => {
             if (currentDomain && confirm(`Are you sure you want to delete all cookies for ${currentDomain}?`)) {
                chrome.cookies.getAll({ domain: currentDomain }, cookies => {
                    cookies.forEach(cookie => chrome.cookies.remove({ url: `http${cookie.secure ? 's' : ''}://${cookie.domain.replace(/^\./, '')}${cookie.path}`, name: cookie.name }));
                    alert(`All cookies for ${currentDomain} deleted.`);
                });
            }
        });
        exportCookiesBtn.addEventListener('click', () => {
            if (!currentDomain) return;
            chrome.cookies.getAll({ domain: currentDomain }, cookies => {
                if (cookies.length > 0) {
                    const json = JSON.stringify(cookies, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    chrome.downloads.download({ url: URL.createObjectURL(blob), filename: `${currentDomain}_cookies.json`, saveAs: true });
                } else {
                    alert('No cookies to export.');
                }
            });
        });
    };

    // --- Websites Tab ---
    const initializeWebsitesTab = () => {
        renderWebsiteList();
        searchBar.addEventListener('input', renderWebsiteList);
        addSiteButton.addEventListener('click', () => {
            const url = prompt("Enter website domain to add:", "example.com");
            if (url) {
                 chrome.storage.local.get({ websites: [] }, result => {
                    const websites = result.websites;
                    if (!websites.some(site => site.url === url)) {
                        websites.push({ url, enabled: true });
                        chrome.storage.local.set({ websites }, renderWebsiteList);
                    } else {
                        alert('Website already in list.');
                    }
                });
            }
        });
        websiteList.addEventListener('click', e => {
            const url = e.target.dataset.url;
            if (!url) return;
            if (e.target.classList.contains('list-delete-btn')) {
                if (confirm(`Delete ${url}?`)) {
                    chrome.storage.local.get({ websites: [] }, result => {
                        const websites = result.websites.filter(site => site.url !== url);
                        chrome.storage.local.set({ websites }, renderWebsiteList);
                    });
                }
            } else if (e.target.classList.contains('list-edit-btn')) {
                openModal(url);
            }
        });
    };

    const renderWebsiteList = () => {
        chrome.storage.local.get(['websites'], result => {
            const websites = result.websites || [];
            const filterText = searchBar.value.toLowerCase();
            websiteList.innerHTML = '';
            websites.filter(site => site.url.toLowerCase().includes(filterText)).forEach(site => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${site.url}</span> <div class="controls"><button class="control-btn list-edit-btn" data-url="${site.url}" title="Edit/Import Cookies">✏️</button> <button class="control-btn list-delete-btn admin-only" data-url="${site.url}" title="Delete Site">🗑️</button></div>`;
                websiteList.appendChild(li);
            });
            updateRoleUI();
        });
    };

    // --- Settings Tab ---
    const initializeSettingsTab = () => {
        if (isAdmin) {
            chrome.storage.local.get('remoteSyncSettings', result => {
                if (result.remoteSyncSettings) {
                    remoteSyncEnabledCheckbox.checked = result.remoteSyncSettings.enabled;
                    remoteSyncUrlInput.value = result.remoteSyncSettings.url;
                }
            });
        }
        logoutButton.addEventListener('click', () => {
            chrome.storage.session.set({ isAdminLoggedIn: false }, () => {
                isAdmin = false;
                updateRoleUI();
            });
        });
        changePasswordButton.addEventListener('click', () => {
            const newPassword = document.getElementById('new-password').value;
            if (newPassword && newPassword.length >= 8) {
                chrome.storage.local.set({ adminPassword: newPassword }, () => alert('Password updated!'));
            } else {
                alert('Password must be at least 8 characters.');
            }
        });
        saveRemoteSyncButton.addEventListener('click', () => {
            const settings = { enabled: remoteSyncEnabledCheckbox.checked, url: remoteSyncUrlInput.value.trim() };
            if (settings.enabled && !settings.url) {
                remoteSyncMessage.textContent = 'URL required if sync is enabled.';
                return;
            }
            chrome.storage.local.set({ remoteSyncSettings: settings }, () => {
                remoteSyncMessage.textContent = 'Settings saved!';
                setTimeout(() => { remoteSyncMessage.textContent = ''; }, 3000);
            });
        });
        exportSyncFileButton.addEventListener('click', () => {
            chrome.storage.local.get(null, allData => {
                const exportData = { websites: allData.websites || [] };
                Object.keys(allData).forEach(key => {
                    if (key.startsWith('master_cookies_')) exportData[key] = allData[key];
                });
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                chrome.downloads.download({ url: URL.createObjectURL(blob), filename: 'biscit_sync.json', saveAs: true });
            });
        });
    };

    // --- Modal & Parsers ---
    const openModal = (siteUrl) => {
        currentlyEditingSite = siteUrl;
        modalSiteName.textContent = siteUrl;
        cookieEditor.value = '';
        modal.style.display = 'block';
    };
    const closeModal = () => {
        modal.style.display = 'none';
        currentlyEditingSite = null;
    };
    closeButton.addEventListener('click', closeModal);
    saveCookiesButton.addEventListener('click', () => {
        const text = cookieEditor.value;
        if (!text || !currentlyEditingSite) return;
        const cookies = parseCookieInput(text);
        if (cookies) {
            const key = `master_cookies_${currentlyEditingSite}`;
            chrome.storage.local.set({ [key]: cookies }, () => {
                alert('Cookies saved!');
                closeModal();
            });
        } else {
            alert('Could not parse cookie data.');
        }
    });
    const parseCookieInput = (text) => {
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            try { return parseNetscapeFormat(text); } catch (e2) { return null; }
        }
        return null;
    };
    const parseNetscapeFormat = (text) => {
        const cookies = [];
        text.split('\n').forEach(line => {
            if (line.startsWith('#') || line.trim() === '') return;
            const parts = line.split('\t');
            if (parts.length >= 7) cookies.push({ domain: parts[0], httpOnly: parts[1].toUpperCase() === 'TRUE', path: parts[2], secure: parts[3].toUpperCase() === 'TRUE', expirationDate: parseInt(parts[4]), name: parts[5], value: parts[6] });
        });
        return cookies.length > 0 ? cookies : null;
    };

    // --- App Startup ---
    initializeApp();
});
