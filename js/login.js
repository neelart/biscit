document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password');
    const actionButton = document.getElementById('action-button');
    const instructions = document.getElementById('instructions');
    const message = document.getElementById('message');
    const defaultPassword = '12345678';

    instructions.textContent = 'Enter your admin password to login.';
    actionButton.textContent = 'Login';

    actionButton.addEventListener('click', () => {
        const password = passwordInput.value;
        if (!password) {
            message.textContent = 'Password cannot be empty.';
            return;
        }

        chrome.storage.local.get(['adminPassword'], (result) => {
            const storedPassword = result.adminPassword;
            let correctPassword = storedPassword || defaultPassword;

            if (password === correctPassword) {
                // If the user logged in with the default password,
                // and they haven't set a custom one yet, we don't set it here.
                // They must change it from the admin panel.
                window.location.href = 'admin.html';
            } else {
                message.textContent = 'Incorrect password.';
            }
        });
    });
});
