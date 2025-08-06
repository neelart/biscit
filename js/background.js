const syncingDomains = new Set();

function performSync(domainUrl, masterCookies) {
    if (!masterCookies || masterCookies.length === 0) {
        console.log(`Biscit: No master cookies provided for ${domainUrl}. Nothing to sync.`);
        syncingDomains.delete(domainUrl);
        return;
    }

    const domainToMatch = domainUrl.startsWith('.') ? domainUrl.substring(1) : domainUrl;
    const urlForCookieQuery = `http://${domainToMatch}`;

    chrome.cookies.getAll({ domain: domainToMatch }, (currentUserCookies) => {
        const deletePromises = currentUserCookies.map(c => {
            const url = `http${c.secure ? 's' : ''}://${c.domain.startsWith('.') ? c.domain.substring(1) : c.domain}${c.path}`;
            return chrome.cookies.remove({ url: url, name: c.name });
        });

        Promise.all(deletePromises).then(() => {
            const setPromises = masterCookies.map(mc => {
                const newCookieUrl = `http${mc.secure ? 's' : ''}://${mc.domain.startsWith('.') ? mc.domain.substring(1) : mc.domain}${mc.path}`;
                return chrome.cookies.set({
                    url: newCookieUrl,
                    name: mc.name,
                    value: mc.value,
                    domain: mc.domain,
                    path: mc.path,
                    secure: mc.secure,
                    httpOnly: mc.httpOnly,
                    expirationDate: mc.expirationDate,
                });
            });
            Promise.all(setPromises).then(() => {
                console.log(`Biscit: Successfully synced cookies for ${domainUrl}`);
                syncingDomains.delete(domainUrl);
            });
        });
    });
}

// Function to sync all cookies for a given domain
function syncDomain(domainUrl) {
    if (syncingDomains.has(domainUrl)) {
        return; // Already syncing this domain.
    }
    syncingDomains.add(domainUrl);

    chrome.storage.local.get(['remoteSyncSettings'], (result) => {
        const settings = result.remoteSyncSettings;
        if (settings && settings.enabled && settings.url) {
            // Remote sync is enabled, try to fetch from URL.
            // We'll assume the server returns a JSON object with a 'cookies' property.
            fetch(`${settings.url}?domain=${encodeURIComponent(domainUrl)}`)
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    throw new Error(`Network response was not ok: ${response.statusText}`);
                })
                .then(data => {
                    if (data.cookies) {
                        console.log(`Biscit: Fetched master cookies for ${domainUrl} from remote.`);
                        performSync(domainUrl, data.cookies);
                    } else {
                        throw new Error("Fetched data does not contain a 'cookies' property.");
                    }
                })
                .catch(error => {
                    console.error(`Biscit: Failed to fetch from remote URL for ${domainUrl}. Falling back to local storage.`, error);
                    // Fallback to local
                    const masterKey = `master_cookies_${domainUrl}`;
                    chrome.storage.local.get(masterKey, (storageResult) => {
                        performSync(domainUrl, storageResult[masterKey]);
                    });
                });
        } else {
            // Remote sync is not enabled, use local storage.
            const masterKey = `master_cookies_${domainUrl}`;
            chrome.storage.local.get(masterKey, (storageResult) => {
                performSync(domainUrl, storageResult[masterKey]);
            });
        }
    });
}


chrome.cookies.onChanged.addListener((changeInfo) => {
    // We only care about explicit changes, not overwrites caused by us or session restores.
    if (changeInfo.cause !== 'explicit') {
        return;
    }

    const domain = changeInfo.cookie.domain.startsWith('.') ? changeInfo.cookie.domain.substring(1) : changeInfo.cookie.domain;

    chrome.storage.local.get(['websites', 'userPreferences'], (result) => {
        const websites = result.websites || [];
        const userPreferences = result.userPreferences || {};

        // Find the matching site URL from the admin settings (e.g., domain is 'sub.example.com', url is 'example.com')
        const siteSetting = websites.find(s => domain.includes(s.url) && s.enabled);

        if (siteSetting) {
            const userPrefersSync = userPreferences[siteSetting.url];
            if (userPrefersSync) {
                syncDomain(siteSetting.url);
            }
        }
    });
});
