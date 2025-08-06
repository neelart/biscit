document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password');
    const actionButton = document.getElementById('action-button');
    const instructions = document.getElementById('instructions');
    const message = document.getElementById('message');

    chrome.storage.local.get(['adminPassword'], (result) => {
        if (result.adminPassword) {
            // Admin password is set, so we're in login mode
            instructions.textContent = 'Enter your admin password to login.';
            actionButton.textContent = 'Login';
        } else {
            // No admin password, so we're in setup mode
            instructions.textContent = 'Create a password to manage Biscit.';
            actionButton.textContent = 'Set Password';
        }
    });

    actionButton.addEventListener('click', () => {
        const password = passwordInput.value;
        if (!password) {
            message.textContent = 'Password cannot be empty.';
            return;
        }

        chrome.storage.local.get(['adminPassword'], (result) => {
            if (result.adminPassword) {
                // Login mode
                if (password === result.adminPassword) {
                    // Correct password, redirect to admin panel
                    window.location.href = 'admin.html';
                } else {
                    message.textContent = 'Incorrect password.';
                }
            } else {
                // Setup mode
                chrome.storage.local.set({ adminPassword: password }, () => {
                    // Redirect to admin panel after setting password
                    window.location.href = 'admin.html';
                });
            }
        });
    });
});
