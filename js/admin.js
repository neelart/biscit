document.addEventListener('DOMContentLoaded', () => {
    const addButton = document.getElementById('add-button');
    const websiteUrlInput = document.getElementById('website-url');
    const websiteList = document.getElementById('website-list');
    const newPasswordInput = document.getElementById('new-password');
    const changePasswordButton = document.getElementById('change-password-button');
    const passwordMessage = document.getElementById('password-message');
    const remoteSyncEnabledCheckbox = document.getElementById('remote-sync-enabled');
    const remoteSyncUrlInput = document.getElementById('remote-sync-url');
    const saveRemoteSyncButton = document.getElementById('save-remote-sync-button');
    const remoteSyncMessage = document.getElementById('remote-sync-message');

    // Basic auth check
    // This check is now implicitly handled by the login page.
    // Anyone reaching this page has successfully authenticated.

    // Function to render the list of websites
    const renderWebsiteList = () => {
        chrome.storage.local.get({ websites: [] }, (result) => {
            websiteList.innerHTML = ''; // Clear the list
            if (result.websites) {
                result.websites.forEach((site, index) => {
                    const listItem = document.createElement('li');

                    const toggle = document.createElement('input');
                    toggle.type = 'checkbox';
                    toggle.checked = site.enabled;
                    toggle.addEventListener('change', () => toggleWebsite(index, toggle.checked));

                    const label = document.createElement('span');
                    label.textContent = site.url;

                    const pushButton = document.createElement('button');
                    pushButton.textContent = 'Push Cookies';
                    pushButton.addEventListener('click', () => pushCookiesToMaster(site.url));

                    const removeButton = document.createElement('button');
                    removeButton.textContent = 'Remove';
                    removeButton.addEventListener('click', () => removeWebsite(index));

                    listItem.appendChild(toggle);
                    listItem.appendChild(label);
                    listItem.appendChild(pushButton);
                    listItem.appendChild(removeButton);
                    websiteList.appendChild(listItem);
                });
            }
        });
    };

    // Function to push current cookies as the master copy
    const pushCookiesToMaster = (domain) => {
        chrome.cookies.getAll({ domain: domain }, (cookies) => {
            const key = `master_cookies_${domain}`;
            // Save locally first
            chrome.storage.local.set({ [key]: cookies }, () => {
                let message = `Cookies for ${domain} have been pushed to local storage.`;

                // Then, push to remote if enabled
                chrome.storage.local.get('remoteSyncSettings', (result) => {
                    const settings = result.remoteSyncSettings;
                    if (settings && settings.enabled && settings.url) {
                        // We will assume the admin has set up their server to handle this POST request.
                        // The body will contain the domain and the cookies.
                        fetch(settings.url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ domain: domain, cookies: cookies }),
                        })
                        .then(response => {
                            if (response.ok) {
                                message += ' And successfully pushed to remote URL.';
                            } else {
                                message += ` Failed to push to remote URL: ${response.statusText}`;
                            }
                            alert(message);
                        })
                        .catch(error => {
                            message += ` Error pushing to remote URL: ${error}`;
                            alert(message);
                        });
                    } else {
                        alert(message);
                    }
                });
            });
        });
    };

    // Function to add a website
    const addWebsite = () => {
        const url = websiteUrlInput.value.trim();
        if (url) {
            chrome.storage.local.get({ websites: [] }, (result) => {
                const websites = result.websites || [];
                // Avoid duplicates
                if (!websites.some(site => site.url === url)) {
                    websites.push({ url: url, enabled: true });
                    chrome.storage.local.set({ websites }, () => {
                        websiteUrlInput.value = '';
                        renderWebsiteList();
                    });
                }
            });
        }
    };

    // Function to toggle a website's enabled status
    const toggleWebsite = (index, enabled) => {
        chrome.storage.local.get({ websites: [] }, (result) => {
            const websites = result.websites;
            if (websites && websites[index]) {
                websites[index].enabled = enabled;
                chrome.storage.local.set({ websites }, renderWebsiteList);
            }
        });
    };

    // Function to remove a website
    const removeWebsite = (index) => {
        chrome.storage.local.get({ websites: [] }, (result) => {
            const websites = result.websites;
            if (websites) {
                websites.splice(index, 1); // Remove the item at the given index
                chrome.storage.local.set({ websites }, renderWebsiteList);
            }
        });
    };

    // Event Listeners
    addButton.addEventListener('click', addWebsite);
    changePasswordButton.addEventListener('click', () => {
        const newPassword = newPasswordInput.value;
        if (newPassword && newPassword.length >= 8) {
            chrome.storage.local.set({ adminPassword: newPassword }, () => {
                newPasswordInput.value = '';
                passwordMessage.textContent = 'Password updated successfully!';
                setTimeout(() => { passwordMessage.textContent = ''; }, 3000);
            });
        } else {
            passwordMessage.textContent = 'Password must be at least 8 characters long.';
        }
    });

    // --- Remote Sync Logic ---
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
            remoteSyncMessage.textContent = 'URL cannot be empty when remote sync is enabled.';
            return;
        }

        chrome.storage.local.set({ remoteSyncSettings: settings }, () => {
            remoteSyncMessage.textContent = 'Sync settings saved!';
            setTimeout(() => { remoteSyncMessage.textContent = ''; }, 3000);
        });
    };

    saveRemoteSyncButton.addEventListener('click', saveRemoteSyncSettings);


    // Initial render
    renderWebsiteList();
    loadRemoteSyncSettings();
});
