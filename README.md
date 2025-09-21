# Stalker UI

A modern and responsive web-based UI for browsing and playing media content (movies and series). This application provides features like searching, categorization, video playback with HLS.js, and an administrative interface.

## Features

-   **Browse & Search:** Easily navigate through a collection of movies and series with search and categorization options.
-   **Video Playback:** Seamless video streaming powered by HLS.js, supporting various media formats.
-   **Interactive Player Controls:** Full-screen mode, mute/volume control, seek functionality, and skip forward/backward.
-   **Video Progress Saving:** Automatically saves your playback progress for each video.
-   **Stream Link Copy:** Easily copy the raw stream URL.
-   **Proxy Toggle:** Option to toggle between direct and proxied stream URLs.
-   **Admin Panel:** An integrated administrative interface for managing content (functionality details within the application).
-   **Responsive Design:** Optimized for various screen sizes, from desktops to mobile devices.

## Technologies Used

-   **Frontend:** React.js, TypeScript
-   **Build Tool:** Vite
-   **Styling:** Tailwind CSS
-   **Video Streaming:** HLS.js, video.js
-   **Notifications:** React-Toastify
-   **Built with:** Gemini Agent

## Installation

To get a local copy up and running, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone git@github.com:santhosh101066/stalker-ui.git
    cd stalker-ui
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Usage

### Development Server

To run the development server with hot-reloading:

```bash
npm run dev
```

This will typically start the application on `http://localhost:5173` (or another available port).

### Building for Production

To build the application for production:

```bash
npm run build
```

This command compiles and bundles the application into the `dist` directory.

### Preview Production Build

To preview the production build locally:

```bash
npm run preview
```

### Linting

To run the linter:

```bash
npm run lint
```

## Project Structure

```
stalker-ui/
├── public/
├── src/
│   ├── api/             # API service integrations
│   ├── assets/          # Static assets
│   ├── components/      # Reusable React components (e.g., VideoPlayer, MediaCard)
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main application component
│   ├── index.css        # Global styles
│   └── main.tsx         # Entry point of the React application
├── .gitignore
├── index.html
├── package.json
├── postcss.config.mjs
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.