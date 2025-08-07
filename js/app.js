// Main UI logic for the Biscit popup (index.html)
document.addEventListener('DOMContentLoaded', () => {
    let isAdmin = false;

    // --- Tab Switching ---
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

    const checkAdminState = () => {
        return new Promise((resolve) => {
            chrome.storage.session.get(['isAdminLoggedIn'], (result) => {
                isAdmin = result.isAdminLoggedIn === true;
                console.log('Admin state:', isAdmin);
                resolve(isAdmin);
            });
        });
    };

    const initializeApp = async () => {
        await checkAdminState();

        // --- Role-based UI updates ---
        const adminOnlyElements = document.querySelectorAll('.admin-only');
        const userSettingsElements = document.querySelector('.user-settings');

        if (isAdmin) {
            document.getElementById('admin-push-control').style.display = 'flex';
            document.getElementById('user-sync-control').style.display = 'none';
            adminOnlyElements.forEach(el => el.style.display = 'block');
            if (userSettingsElements) userSettingsElements.style.display = 'none';
        } else {
            document.getElementById('admin-push-control').style.display = 'none';
            document.getElementById('user-sync-control').style.display = 'flex';
            adminOnlyElements.forEach(el => el.style.display = 'none');
            if (userSettingsElements) userSettingsElements.style.display = 'block';
        }

        console.log('Biscit popup UI loaded. Admin:', isAdmin);
    };

    initializeApp();
});
