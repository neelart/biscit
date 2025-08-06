// Main App Logic
document.addEventListener('DOMContentLoaded', () => {

    // --- Views & State ---
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    let isAdmin = false;

    // --- Login Logic ---
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');
    const loginMessage = document.getElementById('login-message');
    const defaultPassword = '12345678';

    loginButton.addEventListener('click', () => {
        const password = passwordInput.value;
        if (!password) {
            loginMessage.textContent = 'Password cannot be empty.';
            return;
        }

        chrome.storage.local.get(['adminPassword'], (result) => {
            const storedPassword = result.adminPassword;
            let correctPassword = storedPassword || defaultPassword;

            if (password === correctPassword) {
                isAdmin = true;
                showAppView();
            } else {
                loginMessage.textContent = 'Incorrect password.';
                isAdmin = false;
                // Decide if we want to show a non-admin app view or just stay on login
                // For now, only admins can log in to the main view.
            }
        });
    });

    const showAppView = () => {
        loginView.style.display = 'none';
        appView.style.display = 'block';
        renderWebsiteList();
    };

    // --- Website List Logic ---
    const websiteList = document.getElementById('website-list');
    const searchBar = document.getElementById('search-bar');
    const addSiteButton = document.getElementById('add-site-button');

    const renderWebsiteList = () => {
        chrome.storage.local.get({ websites: [] }, (result) => {
            const websites = result.websites;
            const filterText = searchBar.value.toLowerCase();

            websiteList.innerHTML = ''; // Clear list

            const filteredWebsites = websites.filter(site => site.url.toLowerCase().includes(filterText));

            if (isAdmin) {
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'inline-block');
            } else {
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
            }

            filteredWebsites.forEach((site, index) => {
                const li = document.createElement('li');

                const siteName = document.createElement('span');
                siteName.className = 'site-name';
                siteName.textContent = site.url;

                const controls = document.createElement('div');
                controls.className = 'controls';

                // Note: The full implementation of these controls will be in a later phase.
                // This phase is about rendering the list and basic add/delete.
                controls.innerHTML = `
                    <label class="switch">
                        <input type="checkbox" class="sync-toggle" ${site.enabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                    <button class="control-btn refresh-btn">🔄</button>
                    <button class="control-btn edit-btn">✏️</button>
                    <button class="control-btn delete-btn admin-only" data-url="${site.url}">🗑️</button>
                `;

                li.appendChild(siteName);
                li.appendChild(controls);
                websiteList.appendChild(li);
            });
        });
    };

    // Add Site
    addSiteButton.addEventListener('click', () => {
        const url = prompt("Enter the website domain (e.g., example.com):");
        if (url) {
            chrome.storage.local.get({ websites: [] }, (result) => {
                const websites = result.websites;
                if (!websites.some(site => site.url === url)) {
                    websites.push({ url: url, enabled: true });
                    chrome.storage.local.set({ websites }, renderWebsiteList);
                } else {
                    alert('This website is already in the list.');
                }
            });
        }
    });

    // Delete Site
    websiteList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const urlToDelete = e.target.dataset.url;
            if (confirm(`Are you sure you want to delete ${urlToDelete}?`)) {
                chrome.storage.local.get({ websites: [] }, (result) => {
                    let websites = result.websites;
                    websites = websites.filter(site => site.url !== urlToDelete);
                    chrome.storage.local.set({ websites }, renderWebsiteList);
                });
            }
        }
    });

    // Filter
    searchBar.addEventListener('input', renderWebsiteList);

    const showLoginView = () => {
        loginView.style.display = 'block';
        appView.style.display = 'none';
    };

    // --- Initial Check ---
    // A real app would check session state, but for now, we start at login.
    // A non-admin user would see a different view entirely, which we'll handle later.
    // For this phase, we assume the goal is to log in as an admin.
    showLoginView();

});
