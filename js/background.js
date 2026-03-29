// js/background.js

const syncFromRemote = () => {
    chrome.storage.local.get('remoteSyncSettings', (result) => {
        const settings = result.remoteSyncSettings;
        if (settings && settings.enabled && settings.url) {
            console.log('Biscit: Attempting to sync from remote URL:', settings.url);
            fetch(settings.url)
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    throw new Error(`Network response was not ok: ${response.statusText}`);
                })
                .then(data => {
                    // The remote file should contain an object with a 'websites' array
                    // and keys for each site's master cookies, e.g., 'master_cookies_example.com'
                    if (data && data.websites) {
                        // We set the entire object, which will include 'websites' and all 'master_cookies_*' keys.
                        chrome.storage.local.set(data, () => {
                            console.log('Biscit: Successfully synced data from remote.', data);
                        });
                    } else {
                        console.error('Biscit: Fetched data is invalid or missing "websites" property.');
                    }
                })
                .catch(error => {
                    console.error('Biscit: Failed to fetch or parse from remote URL. Using local cache.', error);
                });
        } else {
            console.log('Biscit: Remote sync is not enabled. Skipping remote sync.');
        }
    });
};

// --- Sync on Startup ---
chrome.runtime.onInstalled.addListener(() => {
    // Also runs on update
    syncFromRemote();
});

chrome.runtime.onStartup.addListener(() => {
    syncFromRemote();
});

// --- Cookie Change Listener (for auto-sync) ---
// This will be expanded later to handle auto-push and auto-sync toggles.
chrome.cookies.onChanged.addListener((changeInfo) => {
    if (changeInfo.cause !== 'explicit') return;

    // Placeholder for future logic
});
