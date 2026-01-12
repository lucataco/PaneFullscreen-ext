// Popup script for Pane Fullscreen extension

const statusEl = document.getElementById('status');

function showStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  
  // Auto-hide success messages after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      statusEl.className = 'status';
    }, 3000);
  }
}

async function injectContentScript(tabId) {
  try {
    // Inject the CSS first
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['styles.css']
    });
    
    // Then inject the JS
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    
    return true;
  } catch (error) {
    console.error('Failed to inject content script:', error);
    return false;
  }
}

async function sendMessageToContent(action, isRetry = false) {
  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showStatus('No active tab found', 'error');
      return;
    }

    // Check if we can inject into this tab
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
      showStatus('Cannot run on browser pages', 'error');
      return;
    }

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, { action });
    
    if (response) {
      if (response.success) {
        showStatus(response.message || 'Success!', 'success');
        // Close popup after successful action
        if (action === 'autoFullscreen') {
          setTimeout(() => window.close(), 500);
        }
      } else {
        showStatus(response.message || 'Action failed', 'error');
      }
    }
  } catch (error) {
    console.error('Error:', error);
    
    // If content script isn't loaded, try to inject it
    if (error.message.includes('Receiving end does not exist') || 
        error.message.includes('Could not establish connection')) {
      
      // Only retry once to avoid infinite loops
      if (isRetry) {
        showStatus('Failed to connect. Please refresh the page.', 'error');
        return;
      }
      
      showStatus('Initializing...', 'info');
      
      // Get the tab again for injection
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab) {
        const injected = await injectContentScript(tab.id);
        
        if (injected) {
          // Small delay to let script initialize, then retry
          setTimeout(() => sendMessageToContent(action, true), 150);
        } else {
          showStatus('Cannot run on this page', 'error');
        }
      }
    } else {
      showStatus('Error: ' + error.message, 'error');
    }
  }
}

// Auto fullscreen - finds and expands the largest video
document.getElementById('autoFullscreen').addEventListener('click', () => {
  showStatus('Finding video...', 'info');
  sendMessageToContent('autoFullscreen');
});

// Manual select - lets user click on a video to select it
document.getElementById('selectVideo').addEventListener('click', () => {
  showStatus('Click on any video to select it', 'info');
  sendMessageToContent('selectVideo');
  // Close popup so user can click on video
  setTimeout(() => window.close(), 800);
});
