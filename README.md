# Pane Fullscreen

A Chrome extension that expands videos to fill your browser window without entering true fullscreen mode. Keep your browser chrome visible while enjoying a larger video view.

## Features

- **Auto-detect**: Automatically finds and expands the largest/most prominent video on the page
- **Manual selection**: Click to select any video when auto-detect isn't enough
- **Aspect ratio preserved**: Videos scale proportionally without stretching or distortion
- **ESC to exit**: Press Escape or click the X button to return to normal view
- **Dark overlay**: Focuses attention on the video with a sleek dark background
- **Smooth animations**: Polished fade transitions when entering/exiting
- **Universal compatibility**: Works with YouTube, Vimeo, and most HTML5 video players

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top right corner)
4. Click **Load unpacked**
5. Select the `FullScreen` folder

## Usage

1. Navigate to any webpage containing a video
2. Click the Pane Fullscreen extension icon in your toolbar
3. Choose one of the options:
   - **Fullscreen Video**: Automatically detects and expands the main video
   - **Select Video Manually**: Lets you click on any video to expand it
4. To exit, press **ESC** or click the **X** button in the top right corner

## Why Pane Fullscreen?

Traditional fullscreen mode takes over your entire display, hiding the browser UI and other applications. Pane Fullscreen gives you a larger video view while keeping:

- Browser tabs visible for quick navigation
- The address bar accessible
- Other browser extensions available
- Easy access to other windows and applications

Perfect for multitasking or when you want a bigger video without losing context.

## File Structure

```
FullScreen/
├── manifest.json        # Chrome extension manifest (V3)
├── popup.html           # Extension popup UI
├── popup.js             # Popup interaction logic
├── content.js           # Core video manipulation script
├── styles.css           # Overlay and fullscreen styles
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Browser Support

- Google Chrome (recommended)
- Microsoft Edge (Chromium-based)
- Other Chromium-based browsers

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ESC | Exit pane fullscreen mode |

## Troubleshooting

**"No video found on this page"**
- Some videos are embedded in iframes from different domains and cannot be accessed due to browser security restrictions
- Try using "Select Video Manually" to click directly on the video

**"Please refresh the page and try again"**
- The content script hasn't loaded yet. Refresh the page and try again.

**Video controls not working**
- Native HTML5 video controls should remain functional. If using a custom player, controls may need to be clicked directly on the video.

## License

MIT License - feel free to use and modify as needed.
