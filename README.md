# megademo-maker
# 🎛️ Megademo in a package

A modern tribute to the legendary Amiga/Atari ST megademos of the '80s and '90s — now in your browser! This project brings together retro-style effects, music, and visuals with modern web technologies, allowing users to customize and share their own demo scenes.

## 🚀 Features

- Retro-style effects: Bobs, plasma, scrollers, starfields, and more
- Customizable rolling message with wave and speed controls
- Soundtracker-style music playback using user-supplied samples
- Upload your own assets (sprites, fonts, music, images) from desktop or mobile
- Group name and branding support
- Modular and extensible architecture
---

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

## 🎉 Let the Demo Scene Live On!

This is a love letter to the golden age of demos. Whether you're a coder, artist, or musician — welcome to the party. Customize, remix, and share your own megademo with the world.

---

## 📬 Contributions

Pull requests, ideas, and retro vibes welcome!