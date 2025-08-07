// Main UI logic for the Biscit popup (index.html)
document.addEventListener('DOMContentLoaded', () => {
    let isAdmin = false;

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
        // Future steps will use the 'isAdmin' variable to toggle UI elements.
        console.log('Biscit popup UI loaded. Admin:', isAdmin);
    };

    initializeApp();
});
