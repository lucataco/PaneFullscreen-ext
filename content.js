// Pane Fullscreen - Content Script
// Handles video detection, overlay creation, and fullscreen management
// Supports both native video elements and cross-origin iframe players

(function() {
  'use strict';

  // State management
  let isActive = false;
  let currentElement = null;
  let overlay = null;
  let elementContainer = null;
  let originalElementState = null;
  let selectMode = false;

  // Constants
  const OVERLAY_ID = 'pane-fullscreen-overlay';
  const CONTAINER_ID = 'pane-fullscreen-container';

  // Common video player iframe URL patterns
  const VIDEO_IFRAME_PATTERNS = [
    /player\./i,
    /embed/i,
    /video/i,
    /stream/i,
    /megaplay/i,
    /aniwave/i,
    /youtube\.com\/embed/i,
    /youtube-nocookie\.com\/embed/i,
    /player\.vimeo\.com/i,
    /dailymotion\.com\/embed/i,
    /twitch\.tv\/embed/i,
    /facebook\.com\/plugins\/video/i,
    /streamable\.com/i,
    /vidyard/i,
    /wistia/i,
    /jwplatform/i,
    /brightcove/i,
    /kaltura/i,
    /ooyala/i,
    /vidcloud/i,
    /mp4upload/i,
    /gogoplay/i,
    /streamsb/i,
    /fembed/i,
    /mixdrop/i
  ];

  // Common video container selectors
  const VIDEO_CONTAINER_SELECTORS = [
    '#video-player',
    '#player-container',
    '#player',
    '.video-player',
    '.player-container',
    '.video-container',
    '.player-wrapper',
    '.video-wrapper',
    '[class*="video-player"]',
    '[class*="player-container"]',
    '[id*="video-player"]',
    '[id*="player-container"]'
  ];

  /**
   * Check if an iframe is likely a video player
   */
  function isVideoIframe(iframe) {
    const src = iframe.src || iframe.dataset?.src || '';
    if (!src) return false;
    
    return VIDEO_IFRAME_PATTERNS.some(pattern => pattern.test(src));
  }

  /**
   * Find all video elements on the page, including those in iframes
   */
  function findAllVideos() {
    const videos = [];
    
    // Find videos in main document
    document.querySelectorAll('video').forEach(v => videos.push(v));
    
    // Try to find videos in accessible iframes (same-origin only)
    document.querySelectorAll('iframe').forEach(iframe => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.querySelectorAll('video').forEach(v => videos.push(v));
        }
      } catch (e) {
        // Cross-origin iframe, can't access
      }
    });

    return videos;
  }

  /**
   * Find all video player iframes (including cross-origin)
   */
  function findVideoIframes() {
    const iframes = [];
    
    document.querySelectorAll('iframe').forEach(iframe => {
      // Check if it matches video patterns
      if (isVideoIframe(iframe)) {
        iframes.push(iframe);
        return;
      }
      
      // Check if iframe has reasonable size (likely a player, not an ad)
      const rect = iframe.getBoundingClientRect();
      if (rect.width >= 200 && rect.height >= 150) {
        // Check if it's inside a known video container
        const container = iframe.closest(VIDEO_CONTAINER_SELECTORS.join(', '));
        if (container) {
          iframes.push(iframe);
          return;
        }
        
        // Check aspect ratio (16:9 or similar video aspect ratios)
        const aspectRatio = rect.width / rect.height;
        if (aspectRatio >= 1.2 && aspectRatio <= 2.5) {
          iframes.push(iframe);
        }
      }
    });

    return iframes;
  }

  /**
   * Find video containers that might contain iframes or videos
   */
  function findVideoContainers() {
    const containers = [];
    
    VIDEO_CONTAINER_SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(container => {
        // Only include if it has an iframe or video inside, or has reasonable size
        const hasMedia = container.querySelector('iframe, video');
        const rect = container.getBoundingClientRect();
        
        if (hasMedia || (rect.width >= 200 && rect.height >= 150)) {
          containers.push(container);
        }
      });
    });

    return containers;
  }

  /**
   * Calculate element visibility score (size + visibility)
   */
  function getElementScore(element) {
    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;
    
    // Check if element is visible
    const isVisible = rect.width > 0 && rect.height > 0 &&
                      rect.top < window.innerHeight && rect.bottom > 0 &&
                      rect.left < window.innerWidth && rect.right > 0;
    
    if (!isVisible) return 0;

    let score = area;
    
    // For video elements, bonus for playing videos
    if (element.tagName === 'VIDEO') {
      if (!element.paused && !element.ended) {
        score *= 2;
      }
      if (element.duration > 60) {
        score *= 1.5;
      }
    }
    
    // For iframes, bonus if it matches video patterns
    if (element.tagName === 'IFRAME') {
      if (isVideoIframe(element)) {
        score *= 1.5;
      }
    }

    return score;
  }

  /**
   * Find the best video element on the page
   */
  function findBestVideo() {
    const videos = findAllVideos();
    
    if (videos.length === 0) {
      return null;
    }

    let bestVideo = null;
    let bestScore = 0;

    videos.forEach(video => {
      const score = getElementScore(video);
      if (score > bestScore) {
        bestScore = score;
        bestVideo = video;
      }
    });

    return bestVideo;
  }

  /**
   * Find the best video iframe on the page
   */
  function findBestIframe() {
    const iframes = findVideoIframes();
    
    if (iframes.length === 0) {
      return null;
    }

    let bestIframe = null;
    let bestScore = 0;

    iframes.forEach(iframe => {
      const score = getElementScore(iframe);
      if (score > bestScore) {
        bestScore = score;
        bestIframe = iframe;
      }
    });

    return bestIframe;
  }

  /**
   * Find the best video container on the page
   */
  function findBestContainer() {
    const containers = findVideoContainers();
    
    if (containers.length === 0) {
      return null;
    }

    let bestContainer = null;
    let bestScore = 0;

    containers.forEach(container => {
      const score = getElementScore(container);
      if (score > bestScore) {
        bestScore = score;
        bestContainer = container;
      }
    });

    return bestContainer;
  }

  /**
   * Find the best playable element (video > iframe > container)
   */
  function findBestPlayableElement() {
    // Priority 1: Native video elements
    const video = findBestVideo();
    if (video) {
      return { element: video, type: 'video' };
    }

    // Priority 2: Video iframes
    const iframe = findBestIframe();
    if (iframe) {
      return { element: iframe, type: 'iframe' };
    }

    // Priority 3: Video containers
    const container = findBestContainer();
    if (container) {
      return { element: container, type: 'container' };
    }

    return null;
  }

  /**
   * Get all selectable elements (videos, iframes, containers)
   */
  function getAllSelectableElements() {
    const elements = [];
    
    // Add videos
    findAllVideos().forEach(v => elements.push({ element: v, type: 'video' }));
    
    // Add iframes
    findVideoIframes().forEach(i => elements.push({ element: i, type: 'iframe' }));
    
    // Add containers (only if they don't already contain a found iframe)
    findVideoContainers().forEach(c => {
      const hasFoundIframe = elements.some(e => 
        e.type === 'iframe' && c.contains(e.element)
      );
      if (!hasFoundIframe) {
        elements.push({ element: c, type: 'container' });
      }
    });

    return elements;
  }

  /**
   * Save the original state of an element
   */
  function saveElementState(element) {
    const state = {
      element: element,
      parent: element.parentElement,
      nextSibling: element.nextSibling,
      style: element.getAttribute('style') || '',
      className: element.className,
      type: element.tagName.toLowerCase()
    };

    // For videos, save playback state
    if (element.tagName === 'VIDEO') {
      state.wasPlaying = !element.paused;
      state.currentTime = element.currentTime;
    }

    return state;
  }

  /**
   * Restore element to its original state
   */
  function restoreElementState(element, state) {
    if (!state || !element) return;

    // Restore original styles
    element.setAttribute('style', state.style);
    element.className = state.className;
    
    // Remove our custom classes
    element.classList.remove('pane-fullscreen-video');
    element.classList.remove('pane-fullscreen-iframe');
    element.classList.remove('pane-fullscreen-container');

    // Move element back to original position
    if (state.parent) {
      if (state.nextSibling) {
        state.parent.insertBefore(element, state.nextSibling);
      } else {
        state.parent.appendChild(element);
      }
    }
  }

  /**
   * Create the fullscreen overlay
   */
  function createOverlay() {
    // Remove existing overlay if any
    removeOverlay();

    // Create overlay container
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'pane-fullscreen-overlay';

    // Create element container
    elementContainer = document.createElement('div');
    elementContainer.id = CONTAINER_ID;
    elementContainer.className = 'pane-fullscreen-video-container';

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'pane-fullscreen-close-btn';
    closeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    `;
    closeBtn.title = 'Exit Pane Fullscreen (ESC)';
    closeBtn.addEventListener('click', exitPaneFullscreen);

    // Create hint text
    const hint = document.createElement('div');
    hint.className = 'pane-fullscreen-hint';
    hint.textContent = 'Press ESC to exit';

    // Show hint briefly then fade out
    setTimeout(() => {
      hint.classList.add('fade-out');
    }, 2000);

    overlay.appendChild(elementContainer);
    overlay.appendChild(closeBtn);
    overlay.appendChild(hint);
    document.body.appendChild(overlay);

    return { overlay, elementContainer };
  }

  /**
   * Remove the overlay and clean up
   */
  function removeOverlay() {
    const existingOverlay = document.getElementById(OVERLAY_ID);
    if (existingOverlay) {
      existingOverlay.remove();
    }
    overlay = null;
    elementContainer = null;
  }

  /**
   * Enter pane fullscreen mode for any element (video, iframe, or container)
   */
  function enterPaneFullscreen(element, type = 'video') {
    if (!element) {
      console.warn('Pane Fullscreen: No element provided');
      return false;
    }

    if (isActive) {
      exitPaneFullscreen();
    }

    // Save original state
    originalElementState = saveElementState(element);
    currentElement = element;

    // Create overlay
    createOverlay();

    // Add appropriate class based on type
    if (type === 'video') {
      element.classList.add('pane-fullscreen-video');
    } else if (type === 'iframe') {
      element.classList.add('pane-fullscreen-iframe');
    } else {
      element.classList.add('pane-fullscreen-container');
    }

    // Move element to overlay container
    elementContainer.appendChild(element);

    // For videos, ensure it keeps playing
    if (type === 'video' && originalElementState.wasPlaying) {
      element.play().catch(() => {});
    }

    isActive = true;

    // Focus overlay for keyboard events
    overlay.focus();

    // Trigger animation
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });

    return true;
  }

  /**
   * Exit pane fullscreen mode
   */
  function exitPaneFullscreen() {
    if (!isActive) return;

    // Restore element
    if (currentElement && originalElementState) {
      restoreElementState(currentElement, originalElementState);
      
      // For videos, resume playback if it was playing
      if (originalElementState.type === 'video' && originalElementState.wasPlaying) {
        currentElement.play().catch(() => {});
      }
    }

    // Remove overlay
    removeOverlay();

    // Reset state
    isActive = false;
    currentElement = null;
    originalElementState = null;
  }

  /**
   * Enable element selection mode
   */
  function enableSelectMode() {
    if (selectMode) return;
    selectMode = true;

    // Add selection styling to body
    document.body.classList.add('pane-fullscreen-select-mode');

    // Find all selectable elements
    const selectables = getAllSelectableElements();
    
    selectables.forEach(({ element, type }) => {
      element.classList.add('pane-fullscreen-selectable');
      element.dataset.paneFullscreenType = type;
      
      // Add click handler
      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleElementSelect(element, type);
      };
      
      element.addEventListener('click', handler, { once: true, capture: true });
      element._paneFullscreenHandler = handler;
    });

    // Cancel on ESC
    const cancelSelect = (e) => {
      if (e.key === 'Escape') {
        disableSelectMode();
      }
    };
    document.addEventListener('keydown', cancelSelect, { once: true });

    // Auto-cancel after 15 seconds
    setTimeout(() => {
      if (selectMode) {
        disableSelectMode();
      }
    }, 15000);

    return selectables.length;
  }

  /**
   * Handle element selection
   */
  function handleElementSelect(element, type) {
    disableSelectMode();
    enterPaneFullscreen(element, type);
  }

  /**
   * Disable element selection mode
   */
  function disableSelectMode() {
    if (!selectMode) return;
    selectMode = false;

    document.body.classList.remove('pane-fullscreen-select-mode');

    // Remove selection styling and handlers from all elements
    document.querySelectorAll('.pane-fullscreen-selectable').forEach(element => {
      element.classList.remove('pane-fullscreen-selectable');
      delete element.dataset.paneFullscreenType;
      
      if (element._paneFullscreenHandler) {
        element.removeEventListener('click', element._paneFullscreenHandler, { capture: true });
        delete element._paneFullscreenHandler;
      }
    });
  }

  /**
   * Handle keyboard shortcuts
   */
  function handleKeydown(e) {
    if (e.key === 'Escape' && isActive) {
      e.preventDefault();
      e.stopPropagation();
      exitPaneFullscreen();
    }
  }

  // Listen for keyboard events
  document.addEventListener('keydown', handleKeydown, true);

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'autoFullscreen': {
        const result = findBestPlayableElement();
        if (result) {
          const success = enterPaneFullscreen(result.element, result.type);
          sendResponse({ 
            success, 
            message: success 
              ? `${result.type === 'video' ? 'Video' : result.type === 'iframe' ? 'Player' : 'Container'} expanded to pane fullscreen` 
              : 'Failed to expand element'
          });
        } else {
          sendResponse({ 
            success: false, 
            message: 'No video or player found on this page' 
          });
        }
        break;
      }

      case 'selectVideo': {
        const count = enableSelectMode();
        if (count === 0) {
          disableSelectMode();
          sendResponse({ 
            success: false, 
            message: 'No videos or players found on this page' 
          });
        } else {
          sendResponse({ 
            success: true, 
            message: `Found ${count} element(s). Click one to select.` 
          });
        }
        break;
      }

      case 'exitFullscreen': {
        exitPaneFullscreen();
        sendResponse({ 
          success: true, 
          message: 'Exited pane fullscreen' 
        });
        break;
      }

      case 'getStatus': {
        const selectables = getAllSelectableElements();
        sendResponse({ 
          isActive,
          hasVideos: selectables.length > 0,
          count: selectables.length
        });
        break;
      }

      default:
        sendResponse({ success: false, message: 'Unknown action' });
    }

    return true; // Keep the message channel open for async response
  });

  // Expose for debugging
  window.__paneFullscreen = {
    enter: enterPaneFullscreen,
    exit: exitPaneFullscreen,
    findVideos: findAllVideos,
    findIframes: findVideoIframes,
    findContainers: findVideoContainers,
    findBest: findBestPlayableElement,
    getAll: getAllSelectableElements,
    isActive: () => isActive
  };

})();
