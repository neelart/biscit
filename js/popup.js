document.addEventListener('DOMContentLoaded', () => {
    const siteList = document.getElementById('site-list');

    // Function to render the list of sites
    const renderSiteList = () => {
        // Get the admin-managed websites and user's preferences
        chrome.storage.local.get(['websites', 'userPreferences'], (result) => {
            siteList.innerHTML = ''; // Clear the list
            const websites = result.websites || [];
            const userPreferences = result.userPreferences || {};

            const adminEnabledSites = websites.filter(site => site.enabled);

            if (adminEnabledSites.length === 0) {
                siteList.innerHTML = '<li>No websites are currently shared.</li>';
                return;
            }

            adminEnabledSites.forEach(site => {
                const listItem = document.createElement('li');

                const toggle = document.createElement('input');
                toggle.type = 'checkbox';
                // User's preference for this site, defaults to false (off)
                toggle.checked = userPreferences[site.url] || false;
                toggle.addEventListener('change', () => {
                    toggleSiteOverwrite(site.url, toggle.checked);
                });

                const link = document.createElement('a');
                link.href = 'http://' + site.url;
                link.textContent = site.url;
                link.target = '_blank'; // Open in a new tab

                listItem.appendChild(toggle);
                listItem.appendChild(link);
                siteList.appendChild(listItem);
            });
        });
    };

    // Function to save the user's overwrite preference for a site
    const toggleSiteOverwrite = (url, isEnabled) => {
        chrome.storage.local.get({ userPreferences: {} }, (result) => {
            const userPreferences = result.userPreferences;
            userPreferences[url] = isEnabled;
            chrome.storage.local.set({ userPreferences });
        });
    };

    // Initial render
    renderSiteList();
});
