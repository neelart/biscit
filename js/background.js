const syncingDomains = new Set();

// Function to sync all cookies for a given domain
function syncDomain(domainUrl) {
    if (syncingDomains.has(domainUrl)) {
        return; // Already syncing this domain, exit to prevent loops.
    }
    syncingDomains.add(domainUrl);

    const masterKey = `master_cookies_${domainUrl}`;
    chrome.storage.local.get(masterKey, (storageResult) => {
        const masterCookies = storageResult[masterKey];
        if (!masterCookies) {
            console.log(`Biscit: No master cookies found for ${domainUrl}. Nothing to sync.`);
            syncingDomains.delete(domainUrl);
            return;
        }

        // Find all cookies for the current user on this domain to remove them.
        const domainToMatch = domainUrl.startsWith('.') ? domainUrl.substring(1) : domainUrl;
        const urlForCookieQuery = `http://${domainToMatch}`;

        chrome.cookies.getAll({ domain: domainToMatch }, (currentUserCookies) => {
            // Delete all existing cookies
            const deletePromises = currentUserCookies.map(c => {
                const url = `http${c.secure ? 's' : ''}://${c.domain.startsWith('.') ? c.domain.substring(1) : c.domain}${c.path}`;
                return chrome.cookies.remove({ url: url, name: c.name });
            });

            Promise.all(deletePromises).then(() => {
                // Set all the master cookies
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
