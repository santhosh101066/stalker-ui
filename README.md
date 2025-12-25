<p align="center">
  <img src="public/stalker-logo.svg" alt="Stalker VOD Logo" width="200" />
</p>

<h1 align="center">Stalker VOD Client</h1>

<p align="center">
  A modern, feature-rich OTT/IPTV Player built with React, Vite, and TypeScript.
  Designed for performance, aesthetics, and broad device support including Tizen and WebOS.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Vite-5-purple?style=for-the-badge&logo=vite" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" />
</p>

---

## ✨ Features

- 📺 **Live TV & VOD**: Seamless playback of live channels and video-on-demand content.
- 📱 **Cross-Platform**: Optimized for customized Web Browsers, Samsung Tizen, and LG WebOS.
- 📡 **Casting Support**: Built-in casting capability to stream content to other devices.
- 🎨 **Modern UI**: Polished, glassmorphic design with smooth animations and responsive layout.
- 🔐 **Secure Stream Proxy**: Hides upstream credentials using a dedicated proxy server.
- 📝 **Favorites & History**: Manage your favorite channels and track watch history.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/stalker-ui-v2.git
    cd stalker-ui-v2
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Copy the example environment file and configure your backend IP.
    ```bash
    cp .env.example .env
    ```
    Edit `.env`:
    ```ini
    # Set this to your Stalker Server IP
    VITE_API_HOST=http://YOUR_SERVER_IP:3000
    
    # Deployment Targets
    TIZEN_DIR=/path/to/tizen/project/public
    SERVER_DIR=../stalker-m3u-server/public
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

## 🛠️ Deployment

We use a consolidated `deploy.sh` script to handle builds for different environments.

### Option 1: Deploy to Server (Default)
Builds the app using relative API paths and deploys to the configured `SERVER_DIR`. Best when the app is served from the *same* origin as the API.
```bash
./deploy.sh
```

### Option 2: Deploy to Tizen TV
Builds the app with a hardcoded server IP (from your `.env`) and deploys to the configured `TIZEN_DIR`. Best for Tizen Studio or side-loading.
```bash
./deploy.sh --tizen
```

This will:
1.  Read your configuration.
2.  Build the Vite project.
3.  Deploy the `dist/` artifacts to your configured `DEPLOY_DIR` (default: `../stalker-m3u-server/public`).

## ⚠️ Disclaimer

This application is a **media player only**. It does not provide, host, or distribute any video content, playlists, or streams. Users must provide their own content from legal and authorized sources (e.g., their own Stalker Middlewares or Xtream Codes subscriptions). The developers are not responsible for how this application is used.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
