document.addEventListener('DOMContentLoaded', () => {
    const addButton = document.getElementById('add-button');
    const websiteUrlInput = document.getElementById('website-url');
    const websiteList = document.getElementById('website-list');

    // Basic auth check
    chrome.storage.local.get('adminPassword', (result) => {
        if (!result.adminPassword) {
            // If no password is set, redirect to login to create one.
            window.location.href = 'login.html';
        }
    });

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
            chrome.storage.local.set({ [key]: cookies }, () => {
                alert(`Cookies for ${domain} have been pushed as the master copy.`);
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

    // Initial render
    renderWebsiteList();
});
