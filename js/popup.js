document.addEventListener('DOMContentLoaded', () => {
    const websiteList = document.getElementById('website-list');
    const adminLoginButton = document.getElementById('login-as-admin-button');

    // Modal elements
    const modal = document.getElementById('edit-cookie-modal');
    const modalSiteName = document.getElementById('modal-site-name');
    const closeButton = document.querySelector('.close-button');
    const saveCookiesButton = document.getElementById('save-cookies-button');
    const cookieEditor = document.getElementById('cookie-editor');
    let currentlyEditingSite = null;

    // --- Render list ---
    const renderWebsiteList = () => {
        chrome.storage.local.get(['websites', 'userPreferences'], (result) => {
            const websites = result.websites || [];
            const userPreferences = result.userPreferences || {};
            websiteList.innerHTML = '';

            websites.forEach(site => {
                // In user view, we only show sites that the admin has enabled.
                if (site.enabled) {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>${site.url}</span>
                        <div class="controls">
                            <label class="switch">
                                <input type="checkbox" class="sync-toggle" data-url="${site.url}" ${userPreferences[site.url] ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                            <button class="control-btn edit-btn" data-url="${site.url}">✏️</button>
                        </div>
                    `;
                    websiteList.appendChild(li);
                }
            });
        });
    };

    // --- Event Listeners ---
    adminLoginButton.addEventListener('click', () => {
        // chrome.runtime.openOptionsPage() is the modern way to open the options page.
        chrome.runtime.openOptionsPage();
    });

    // Event delegation for controls
    websiteList.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('edit-btn')) {
            currentlyEditingSite = target.dataset.url;
            openModal(currentlyEditingSite);
        }
        if (target.classList.contains('sync-toggle')) {
            const url = target.dataset.url;
            const isEnabled = target.checked;
            chrome.storage.local.get({ userPreferences: {} }, (result) => {
                const prefs = result.userPreferences;
                prefs[url] = isEnabled;
                chrome.storage.local.set({ userPreferences: prefs });
            });
        }
    });

    // --- Modal Logic ---
    const openModal = (siteUrl) => {
        modalSiteName.textContent = siteUrl;
        cookieEditor.value = ''; // Clear previous content
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
                // Disable sync for this site as the user has manually edited it.
                chrome.storage.local.get({ userPreferences: {} }, (result) => {
                    const prefs = result.userPreferences;
                    prefs[currentlyEditingSite] = false;
                    chrome.storage.local.set({ userPreferences: prefs }, () => {
                        alert('Cookies saved successfully. Auto-sync has been disabled for this site.');
                        renderWebsiteList();
                        closeModal();
                    });
                });
            });
        } else {
            alert('Could not parse cookie data. Please check the format.');
        }
    });

    // --- Cookie Parsing Logic ---
    const parseCookieInput = (text) => {
        try {
            // Try parsing as JSON array
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                // Basic validation, check for name and value properties
                if (parsed.every(c => c.name && c.value)) {
                    return parsed;
                }
            }
        } catch (e) {
            // Not JSON, try parsing as Netscape format
            try {
                return parseNetscapeFormat(text);
            } catch (e2) {
                return null;
            }
        }
        return null;
    };

    const parseNetscapeFormat = (text) => {
        const cookies = [];
        const lines = text.split('\n');
        lines.forEach(line => {
            if (line.startsWith('#') || line.trim() === '') {
                return;
            }
            const parts = line.split('\t');
            if (parts.length >= 7) {
                cookies.push({
                    domain: parts[0],
                    httpOnly: parts[1].toUpperCase() === 'TRUE',
                    path: parts[2],
                    secure: parts[3].toUpperCase() === 'TRUE',
                    expirationDate: parseInt(parts[4], 10),
                    name: parts[5],
                    value: parts[6]
                });
            }
        });
        return cookies.length > 0 ? cookies : null;
    };


    // Initial Render
    renderWebsiteList();
});
