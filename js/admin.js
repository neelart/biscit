document.addEventListener('DOMContentLoaded', () => {
    // --- Views ---
    const loginView = document.getElementById('admin-login-view');
    const mainView = document.getElementById('admin-main-view');

    // --- Login Logic ---
    const passwordInput = document.getElementById('admin-password-input');
    const loginButton = document.getElementById('admin-login-button');
    const loginMessage = document.getElementById('admin-login-message');
    const defaultPassword = '12345678';

    loginButton.addEventListener('click', () => {
        const password = passwordInput.value;
        chrome.storage.local.get(['adminPassword'], (result) => {
            const correctPassword = result.adminPassword || defaultPassword;
            if (password === correctPassword) {
                chrome.storage.session.set({ isAdminLoggedIn: true }, () => {
                    showMainView();
                });
            } else {
                loginMessage.textContent = 'Incorrect password.';
            }
        });
    });

    // --- View Switching ---
    const showMainView = () => {
        loginView.style.display = 'none';
        mainView.style.display = 'block';
        renderWebsiteList();
        renderDeviceList();
        loadRemoteSyncSettings();
    };

    const showLoginView = () => {
        loginView.style.display = 'block';
        mainView.style.display = 'none';
    };

    // --- Initial Check ---
    chrome.storage.session.get(['isAdminLoggedIn'], (result) => {
        if (result.isAdminLoggedIn) {
            showMainView();
        } else {
            showLoginView();
        }
    });

    // --- Tab Switching Logic ---
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

    // --- Website List Logic ---
    const websiteList = document.getElementById('website-list');
    const addCurrentTabButton = document.getElementById('add-current-tab-button');
    let currentlyEditingSite = null;

    const renderWebsiteList = () => {
        chrome.storage.local.get(['websites'], (result) => {
            const websites = result.websites || [];
            websiteList.innerHTML = '';
            websites.forEach(site => {
                const li = document.createElement('li');
                const siteName = document.createElement('span');
                siteName.textContent = site.url;
                const controls = document.createElement('div');
                controls.className = 'controls';
                controls.innerHTML = `
                    <label class="switch" title="Enable/Disable Sharing">
                        <input type="checkbox" class="sync-toggle" data-url="${site.url}" ${site.enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                    <button class="control-btn edit-btn" data-url="${site.url}" title="Edit/Import Cookies">✏️</button>
                    <button class="control-btn push-btn" data-url="${site.url}" title="Push Cookies to Master">⬆️</button>
                    <button class="control-btn delete-btn" data-url="${site.url}" title="Delete Site">🗑️</button>
                `;
                li.appendChild(siteName);
                li.appendChild(controls);
                websiteList.appendChild(li);
            });
        });
    };

    addCurrentTabButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url) {
                try {
                    const url = new URL(tabs[0].url);
                    const domain = url.hostname;
                    chrome.storage.local.get({ websites: [] }, (result) => {
                        const websites = result.websites;
                        if (!websites.some(site => site.url === domain)) {
                            websites.push({ url: domain, enabled: true });
                            chrome.storage.local.set({ websites }, renderWebsiteList);
                        } else {
                            alert('This website is already in the list.');
                        }
                    });
                } catch (e) {
                    alert('Could not get a valid domain from the current tab.');
                }
            }
        });
    });

    websiteList.addEventListener('click', (e) => {
        const button = e.target.closest('button.control-btn');
        const toggle = e.target.closest('input.sync-toggle');

        if (button) {
            const url = button.dataset.url;
            if (!url) return;
            if (button.classList.contains('delete-btn')) {
                if (confirm(`Are you sure you want to delete ${url}?`)) {
                    chrome.storage.local.get({ websites: [] }, (result) => {
                        let websites = result.websites.filter(site => site.url !== url);
                        chrome.storage.local.set({ websites }, renderWebsiteList);
                    });
                }
            } else if (button.classList.contains('push-btn')) {
                chrome.cookies.getAll({ domain: url }, (cookies) => {
                    if (cookies && cookies.length > 0) {
                        const key = `master_cookies_${url}`;
                        chrome.storage.local.set({ [key]: cookies }, () => {
                            let message = `Pushed ${cookies.length} cookies for ${url} to local master.`;
                            chrome.storage.local.get('remoteSyncSettings', (settingsResult) => {
                                const settings = settingsResult.remoteSyncSettings;
                                if (settings && settings.enabled && settings.url) {
                                    fetch(settings.url, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ domain: url, cookies: cookies }),
                                    })
                                    .then(response => {
                                        message += response.ok ? ' And pushed to remote.' : ' But failed to push to remote.';
                                        alert(message);
                                    })
                                    .catch(err => {
                                        message += ` But failed to push to remote: ${err}`;
                                        alert(message);
                                    });
                                } else {
                                    alert(message);
                                }
                            });
                        });
                    } else {
                        alert(`No cookies found for domain ${url} to push.`);
                    }
                });
            } else if (button.classList.contains('edit-btn')) {
                currentlyEditingSite = url;
                openModal(url);
            }
        } else if (toggle) {
            const url = toggle.dataset.url;
            chrome.storage.local.get({ websites: [] }, (result) => {
                const websites = result.websites;
                const site = websites.find(s => s.url === url);
                if (site) {
                    site.enabled = toggle.checked;
                    chrome.storage.local.set({ websites });
                }
            });
        }
    });

    // --- Modal Logic ---
    const modal = document.getElementById('edit-cookie-modal');
    const modalSiteName = modal.querySelector('#modal-site-name');
    const closeButton = modal.querySelector('.close-button');
    const saveCookiesButton = modal.querySelector('#save-cookies-button');
    const cookieEditor = modal.querySelector('#cookie-editor');

    const openModal = (siteUrl) => {
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
        let cookies = parseCookieInput(text);
        if (cookies) {
            const key = `master_cookies_${currentlyEditingSite}`;
            chrome.storage.local.set({ [key]: cookies }, () => {
                alert('Cookies saved successfully.');
                closeModal();
            });
        } else {
            alert('Could not parse cookie data. Please check the format.');
        }
    });

    const parseCookieInput = (text) => {
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed) && parsed.every(c => c.name && c.value)) return parsed;
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

    // --- Settings Logic (Tab 2) ---
    const changePasswordButton = document.getElementById('change-password-button');
    const logoutButton = document.getElementById('logout-button');
    const remoteSyncEnabledCheckbox = document.getElementById('remote-sync-enabled');
    const remoteSyncUrlInput = document.getElementById('remote-sync-url');
    const saveRemoteSyncButton = document.getElementById('save-remote-sync-button');
    const remoteSyncMessage = document.getElementById('remote-sync-message');

    const loadRemoteSyncSettings = () => {
        chrome.storage.local.get('remoteSyncSettings', (result) => {
            if (result.remoteSyncSettings) {
                remoteSyncEnabledCheckbox.checked = result.remoteSyncSettings.enabled;
                remoteSyncUrlInput.value = result.remoteSyncSettings.url;
            }
        });
    };

    const saveRemoteSyncSettings = () => {
        const settings = {
            enabled: remoteSyncEnabledCheckbox.checked,
            url: remoteSyncUrlInput.value.trim()
        };
        if (settings.enabled && !settings.url) {
            remoteSyncMessage.textContent = 'URL cannot be empty when enabled.';
            return;
        }
        chrome.storage.local.set({ remoteSyncSettings: settings }, () => {
            remoteSyncMessage.textContent = 'Sync settings saved!';
            setTimeout(() => { remoteSyncMessage.textContent = ''; }, 3000);
        });
    };

    saveRemoteSyncButton.addEventListener('click', saveRemoteSyncSettings);

    changePasswordButton.addEventListener('click', () => {
        const newPassword = document.getElementById('new-password').value;
        if (newPassword && newPassword.length >= 8) {
            chrome.storage.local.set({ adminPassword: newPassword }, () => {
                alert('Password updated successfully!');
                document.getElementById('new-password').value = '';
            });
        } else {
            alert('Password must be at least 8 characters long.');
        }
    });
    logoutButton.addEventListener('click', () => {
        chrome.storage.session.set({ isAdminLoggedIn: false }, () => {
            showLoginView();
        });
    });

    // --- Devices Logic (Tab 3) ---
    const deviceList = document.getElementById('device-list');
    const renderDeviceList = () => {
        const devices = [ { id: 'device-1', ip: '192.168.1.10', isBlocked: false }, { id: 'device-2', ip: '10.0.0.5', isBlocked: true }, ];
        deviceList.innerHTML = '';
        devices.forEach(device => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${device.ip} (ID: ${device.id})</span><button class="block-btn" data-id="${device.id}">${device.isBlocked ? 'Unblock' : 'Block'}</button>`;
            deviceList.appendChild(li);
        });
    };
});
