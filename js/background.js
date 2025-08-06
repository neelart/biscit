// js/background.js

const updateUserPopup = () => {
    chrome.storage.session.get(['isAdminLoggedIn'], (result) => {
        if (result.isAdminLoggedIn) {
            chrome.action.setPopup({ popup: 'html/admin.html' });
        } else {
            chrome.action.setPopup({ popup: 'html/popup.html' });
        }
    });
};

chrome.runtime.onStartup.addListener(updateUserPopup);
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'session' && changes.isAdminLoggedIn) {
        updateUserPopup();
    }
});
chrome.runtime.onInstalled.addListener(updateUserPopup);

// --- Cookie Sync Logic ---
const syncingDomains = new Set();

function performSync(domainUrl, masterCookies) {
    if (!masterCookies || masterCookies.length === 0) {
        console.log(`Biscit: No master cookies for ${domainUrl}.`);
        syncingDomains.delete(domainUrl);
        return;
    }
    const domainToMatch = domainUrl.startsWith('.') ? domainUrl.substring(1) : domainUrl;
    chrome.cookies.getAll({ domain: domainToMatch }, (currentUserCookies) => {
        const deletePromises = currentUserCookies.map(c => {
            const url = `http${c.secure ? 's' : ''}://${c.domain.startsWith('.') ? c.domain.substring(1) : c.domain}${c.path}`;
            return chrome.cookies.remove({ url: url, name: c.name });
        });
        Promise.all(deletePromises).then(() => {
            const setPromises = masterCookies.map(mc => {
                const newCookieUrl = `http${mc.secure ? 's' : ''}://${mc.domain.startsWith('.') ? mc.domain.substring(1) : mc.domain}${mc.path}`;
                return chrome.cookies.set({ url: newCookieUrl, name: mc.name, value: mc.value, domain: mc.domain, path: mc.path, secure: mc.secure, httpOnly: mc.httpOnly, expirationDate: mc.expirationDate });
            });
            Promise.all(setPromises).then(() => {
                console.log(`Biscit: Synced cookies for ${domainUrl}`);
                syncingDomains.delete(domainUrl);
            });
        });
    });
}

function syncDomain(domainUrl) {
    if (syncingDomains.has(domainUrl)) return;
    syncingDomains.add(domainUrl);

    chrome.storage.local.get(['remoteSyncSettings'], (result) => {
        const settings = result.remoteSyncSettings;
        if (settings && settings.enabled && settings.url) {
            fetch(`${settings.url}?domain=${encodeURIComponent(domainUrl)}`)
                .then(response => response.ok ? response.json() : Promise.reject('Network response not ok'))
                .then(data => {
                    if (data.cookies) {
                        performSync(domainUrl, data.cookies);
                    } else {
                        return Promise.reject('No "cookies" property in response.');
                    }
                })
                .catch(error => {
                    console.error(`Biscit: Remote fetch failed for ${domainUrl}. Falling back to local.`, error);
                    const masterKey = `master_cookies_${domainUrl}`;
                    chrome.storage.local.get(masterKey, (storageResult) => {
                        performSync(domainUrl, storageResult[masterKey]);
                    });
                });
        } else {
            const masterKey = `master_cookies_${domainUrl}`;
            chrome.storage.local.get(masterKey, (storageResult) => {
                performSync(domainUrl, storageResult[masterKey]);
            });
        }
    });
}

chrome.cookies.onChanged.addListener((changeInfo) => {
    if (changeInfo.cause !== 'explicit') return;

    const domain = changeInfo.cookie.domain.startsWith('.') ? changeInfo.cookie.domain.substring(1) : changeInfo.cookie.domain;

    chrome.storage.local.get(['websites', 'userPreferences'], (result) => {
        const websites = result.websites || [];
        const userPreferences = result.userPreferences || {};
        const siteSetting = websites.find(s => domain.includes(s.url) && s.enabled);

        if (siteSetting && userPreferences[siteSetting.url]) {
            syncDomain(siteSetting.url);
        }
    });
});
