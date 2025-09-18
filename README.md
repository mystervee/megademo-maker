# megademo-maker
# 🎛️ Megademo in a package

A modern tribute to the legendary Amiga/Atari ST megademos of the '80s and '90s — now in your browser! This project brings together retro-style effects, music, and visuals with modern web technologies, allowing users to customize and share their own demo scenes.

## 📦 Prerequisites

- **Node.js with npm (default package manager):** The project uses npm for all scripts and dependency management. Install the current LTS release of Node.js, which ships with npm, so that the commands in this guide work as written.
  - **Windows installation:** Download the official installer from [nodejs.org](https://nodejs.org/), run it, and ensure the options to install npm and add Node.js to your system `PATH` remain selected. After the installer completes, open a fresh PowerShell window and confirm the tools are available by running `node --version` and `npm --version`. Both commands should print version numbers without errors.
  - If `npm` or `node` is not recognized, sign out and back in (or restart PowerShell) so that the updated `PATH` takes effect, or manually add the installation directory (for example, `C:\Program Files\nodejs\`) to your `PATH` environment variable.

## 🚀 Features

- Retro-style effects: Bobs, plasma, scrollers, starfields, and more
- Customizable rolling message with wave and speed controls
- Soundtracker-style music playback using user-supplied samples
- Upload your own assets (sprites, fonts, music, images) from desktop or mobile
- Group name and branding support
- Modular and extensible architecture
---

## 🗺️ Project Scope & Roadmap

### MVP (First Release)
- Hosted web application that runs directly in the browser
- Configurable visual effects suite (bobs, plasma, starfield, and other retro shaders)
- Customizable scroller with adjustable text, wave, and speed controls
- Audio playback powered by tracker-style sequencing and user-supplied samples
- Asset upload pipeline for sprites, fonts, music, and images on desktop and mobile

### Stretch Goals (Post-v1)
- In-browser video export/recording for sharing to social platforms
- Progressive Web App (PWA) packaging for offline installs and home screen access
- “Demo Party” playlist mode for sequencing multiple demos back-to-back

### Non-Goals for v1
- Native desktop or console builds
- Multiplayer or live-synced party experiences
- Automated asset marketplace or online library integrations
- Advanced shader editor or node-based effect authoring

## 🛠️ Tunables & Settings

All tunables can be configured via a `config.json` file or a web-based UI (coming soon).

### 🎨 Visual Effects
#### Bobs (Blitter Objects)
- `bobCount`: Number of bobs on screen
- `bobColorPalette`: Array of colors or gradients
- `bobSize`: Size in pixels
- `bobSpeed`: Movement speed
- `bobBlendMode`: e.g., `normal`, `additive`, `multiply`

#### Plasma
- `plasmaResolution`: Low/Medium/High
- `plasmaColorScheme`: Preset or custom gradient
- `plasmaSpeed`: Animation speed
- `plasmaIntensity`: Contrast/brightness level

#### Starfield
- `starCount`: Number of stars
- `starSpeed`: Speed of movement
- `starColor`: Single or multi-color

### 📝 Rolling Message (Scroller)
- `messageText`: The text to scroll
- `messageFont`: Choose from built-in fonts or upload your own (image-based or TTF)
- `messageWaveAmplitude`: Vertical wave height
- `messageWaveFrequency`: How often the wave oscillates
- `messageSpeed`: Horizontal scroll speed
- `messageColor`: Text color or gradient

### 🎶 Music & Sound
- `trackerPattern`: JSON or module format for music pattern
- `sampleBank`: Upload your own WAV/MP3 samples
- `bpm`: Beats per minute
- `loop`: Enable/disable looping
---

## 🎛️ User Settings

These can be set via a UI or config file:

- `groupName`: Name of your demo group
- `theme`: Light/Dark/CRT/Custom
- `assets`: Upload section for:
  - Sprites
  - Background images
  - Fonts (bitmap or TTF)
  - Music samples
- `mobileUploadSupport`: Drag-and-drop or file picker for mobile devices
---

## 📁 Folder Structure
megademo-maker/
├── assets/
│   ├── images/
│   ├── music/
│   ├── fonts/
│   └── sprites/
├── src/
│   ├── effects/
│   ├── audio/
│   ├── ui/
│   └── main.js
├── config/
│   └── config.json
├── index.html
└── README.md

---

## 💡 Suggestions for Future Features

- Shader-based effects (GLSL/WebGL)
- Online asset library integration (e.g., OpenGameArt)
- QR code sharing for mobile demos
- Save/load demo presets
- Multiplayer demo parties (sync via WebRTC?)

---

## 📲 Mobile Support

To make it easy for users to upload assets from mobile:
- Use `<input type="file" accept="image/*,audio/*">` with drag-and-drop
- Implement a preview system for uploaded assets
- Consider using IndexedDB or localStorage for temporary asset caching

---

## 🧪 Tech Stack

- HTML5 Canvas / WebGL
- JavaScript (ES6+)
- Web Audio API
- Optional: React/Vue for UI, if needed

---

## 📤 Sharing & Distribution
Your megademo deserves to be seen! Here are the supported and planned methods for sharing your creation:

### 🌐 Webpage (Primary Method)
The demo runs directly in the browser — no install needed. Users can share a link to their demo, which can be embedded in social media posts or opened on mobile devices.

**Features:**
- Unique URLs for each demo (e.g., `megademo.fun/demo?id=xyz`)
- Open Graph tags for rich previews on platforms like Twitter/X, Facebook
- “Share” button to copy link or generate QR code
### 📹 Export to Video
Perfect for uploading to YouTube, TikTok, or Instagram. This feature allows users to record their demo and export it as a video file.

**Planned Features:**
- Canvas + MediaRecorder API for in-browser recording
- Export formats: MP4/WebM
- “Record My Demo” button for easy capture
### 📲 Social Media Embeds
Make your demo go viral! With proper metadata, your demo link will show a preview image and description when shared.

**Implementation Tips:**
- Add Open Graph and Twitter Card metadata to your HTML
- Generate preview images dynamically from canvas
- Use the Web Share API for mobile-friendly sharing
### 🧩 Progressive Web App (PWA)
Turn your demo into an installable app! Users can save it to their home screen and run it offline.

**Benefits:**
- Offline access via service worker
- Installable on desktop and mobile
- Seamless experience across devices

### 🎛️ Demo Party Mode (Future Feature)
Let users create a playlist of demos and play them back-to-back — just like a real demo party!

**Ideas:**
- Shareable playlist links
- Export as video montage
- Sync playback via WebRTC for live demo parties

---

## 🚀 Deployment

Once you have run `npm run build`, the `dist/` directory contains a static version of your megademo that can be hosted almost anywhere. Common options include:

- **Cloudflare Pages:** Install the [Wrangler CLI](https://developers.cloudflare.com/pages/get-started/#install) and run `wrangler pages publish dist` to push the latest build straight from your terminal. You can also deploy from the Cloudflare dashboard by creating a new Pages project, choosing the **Direct Upload** workflow, and uploading the contents of `dist/`. Either route gives you a live URL (and optional custom domain) where the demo plays instantly.
- **itch.io (HTML5 project):** Zip the contents of `dist/` (for example, `zip -r megademo.zip dist/*`) and upload it to a new itch.io project configured as **Kind of project → HTML5**. itch.io extracts the archive, hosts the playable build, and provides a shareable project URL (e.g., `https://yourname.itch.io/megademo`) that you can post publicly or keep restricted.

After deployment, any exported demos or in-app share links simply point to the hosted URL for that build, so you can distribute the Cloudflare Pages or itch.io link exactly as-is and your audience gets the live, playable experience in their browser.

---

## 🧑‍💻 Local Development

1. Clone this repository and move into the project directory.
2. Install dependencies with `npm install`.
3. Start the development server using `npm run dev` and follow the on-screen URL to open the app in your browser.

> **Windows tip:** PowerShell, Command Prompt, and Git Bash all work with the npm scripts in this project. Use a shell session that was opened after installing Node.js so that `node` and `npm` are available on your `PATH`. If PowerShell reports that running scripts is disabled, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once from an elevated PowerShell window, or switch to Command Prompt/Git Bash before retrying `npm run dev`.

---

## 🎉 Let the Demo Scene Live On!

This is a love letter to the golden age of demos. Whether you're a coder, artist, or musician — welcome to the party. Customize, remix, and share your own megademo with the world.

---

## 📬 Contributions

Pull requests, ideas, and retro vibes welcome!