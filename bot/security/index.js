// src/bot/security/index.js
import { antiraid } from './antiraid.js';

export function applySecurity(client) {
  antiraid(client);
  console.log('🛡️ Security modules loaded');
}

// Auto-apply if imported directly (optional)
if (typeof client !== 'undefined') {
  applySecurity(client);
}
