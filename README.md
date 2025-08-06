# Biscit - Cookie Sharing Extension

Biscit is a Chrome extension that enables seamless sharing of cookies for selected websites across multiple devices, with powerful admin controls.

## Features

- **Admin-Controlled Website List**: An admin can specify which websites are eligible for cookie sharing.
- **Master Cookie Management**: The admin can "push" their current set of cookies for a site, making them the "master" copy.
- **User Opt-In**: Users can choose on a per-site basis whether they want their cookies to be overwritten with the master copy.
- **Local-First Storage**: All data (settings, master cookies) is stored in your browser's local storage.
- **Optional Remote Sync**: For advanced users, an admin can configure a self-hosted URL to store and retrieve master cookies, allowing for synchronization across different users and devices without needing to be on the same Chrome profile.

## How to Use

### Admin Setup

1.  **Access the Admin Panel**:
    - Right-click the Biscit extension icon in your Chrome toolbar and select "Options".
    - Alternatively, navigate to `chrome://extensions`, find "Biscit", click "Details", and then "Extension options".

2.  **First-Time Login**:
    - The first time you open the admin panel, you will be asked for a password.
    - The default password is: `12345678`
    - It is highly recommended to change this default password immediately.

3.  **Changing the Password**:
    - In the admin panel, you will find a "Change Admin Password" section.
    - Enter a new password (must be at least 8 characters) and click "Save Password".

### Managing Websites

- **Add a Website**: Enter the domain of the website (e.g., `example.com`) in the "Add Website" input and click the "Add Website" button.
- **Enable/Disable Sharing**: Use the toggle next to each website to enable or disable cookie sharing for that site. If disabled, no cookie synchronization will occur for any user for that site.
- **Pushing Master Cookies**: To set the "master" copy of cookies for a site, log into that site as you normally would, then come back to the admin panel and click the **"Push Cookies"** button for that site. This will save your current cookies for that domain as the master version.

### Remote Sync (Optional)

This is an advanced feature that allows you to use your own server as a storage backend for the master cookies.

1.  **Setup Your Server**:
    - You need a server endpoint that can handle two types of requests:
      - `POST` requests: When the admin pushes cookies, the extension will send a `POST` request to your URL with a JSON body like: `{"domain":"example.com", "cookies":[...]}`. Your server should save the `cookies` array in a way that it can be retrieved by the domain.
      - `GET` requests: When a user's extension tries to sync, it will send a `GET` request to `YOUR_URL?domain=example.com`. Your server should respond with a JSON object containing the cookies for that domain, like: `{"cookies":[...]}`.

2.  **Configure in Admin Panel**:
    - In the "Remote Sync Settings" section, check the "Enable Remote Sync" box.
    - Enter the URL of your server endpoint.
    - Click "Save Sync Settings".

- When enabled, the "Push Cookies" button will save to both local storage and your remote URL.
- User extensions will attempt to fetch from the remote URL first, falling back to local storage if the remote fetch fails.

### User Experience

For a non-admin user (or an admin on a different machine without logging in as admin), the extension popup provides a simple interface:

- A list of all websites enabled for sharing by the admin is displayed.
- Each website is a clickable link that opens in a new tab.
- Users can use the toggle next to each site to enable or disable cookie overwriting for their browser. If the toggle is on, their cookies for that site will be kept in sync with the master copy.
