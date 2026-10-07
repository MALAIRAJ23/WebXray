/**
 * Chrome runtime messaging wrapper with sender/type validation
 * Conforms to Rule 6 (Validate message shape)
 */

export function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      reject(new Error('chrome.runtime.sendMessage is not available'));
      return;
    }

    if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
      reject(new Error('Invalid message shape: { type: string } required'));
      return;
    }

    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
