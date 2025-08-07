// Logic for the Biscit options page (options.html) - primarily for admin login.
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('admin-password-input');
    const loginButton = document.getElementById('admin-login-button');
    const loginMessage = document.getElementById('login-message');
    const defaultPassword = '12345678';

    loginButton.addEventListener('click', () => {
        const password = passwordInput.value;
        chrome.storage.local.get(['adminPassword'], (result) => {
            const correctPassword = result.adminPassword || defaultPassword;
            if (password === correctPassword) {
                // Use session storage to keep the user logged in for the session.
                chrome.storage.session.set({ isAdminLoggedIn: true }, () => {
                    loginMessage.textContent = 'Login successful! You can close this page.';
                    loginMessage.style.color = 'green';
                });
            } else {
                loginMessage.textContent = 'Incorrect password.';
                loginMessage.style.color = 'red';
            }
        });
    });
});
