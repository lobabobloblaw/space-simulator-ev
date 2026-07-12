/**
 * ErrorUtils - Centralized error handling utilities
 * Provides consistent logging, user notification, and async error wrapping
 */

import { getEventBus, GameEvents } from '../core/EventBus.js';

// In-memory error log for debugging (circular buffer)
const ERROR_LOG_MAX = 50;
const errorLog = [];

/**
 * Log an error with context information
 * @param {string} context - Where the error occurred (e.g., 'SaveSystem', 'NPCSystem')
 * @param {Error|string} error - The error object or message
 * @param {boolean} notify - Whether to notify the user via UI
 */
export function logError(context, error, notify = false) {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : null;

    // Console output with context
    console.error(`[${context}] ${errorMessage}`);
    if (errorStack) {
        console.error(errorStack);
    }

    // Add to in-memory log (circular buffer)
    const logEntry = {
        timestamp,
        context,
        message: errorMessage,
        stack: errorStack
    };
    errorLog.push(logEntry);
    if (errorLog.length > ERROR_LOG_MAX) {
        errorLog.shift();
    }

    // Optionally notify user
    if (notify) {
        notifyUser(`Error in ${context}: ${errorMessage}`, 'error');
    }
}

/**
 * Get recent errors for debugging
 * @returns {Array} Recent error log entries
 */
export function getRecentErrors() {
    return [...errorLog];
}

/**
 * Clear the error log
 */
export function clearErrorLog() {
    errorLog.length = 0;
}

/**
 * Notify the user via UI message
 * @param {string} message - Message to display
 * @param {string} type - Message type: 'info', 'success', 'warning', 'error'
 */
export function notifyUser(message, type = 'warning') {
    try {
        const eventBus = getEventBus();
        if (eventBus) {
            eventBus.emit(GameEvents.UI_MESSAGE, {
                message: message,
                type: type,
                duration: type === 'error' ? 4000 : 2500
            });
        }
    } catch (e) {
        // Fallback to console if EventBus not available
        console.warn('[ErrorUtils] Could not emit UI_MESSAGE:', message);
    }

    // Also create fallback DOM notification in case UISystem isn't handling it
    if (type === 'error' || type === 'warning') {
        createFallbackNotification(message, type);
    }
}

/**
 * Create a fallback DOM notification
 * @param {string} message - Message to display
 * @param {string} type - Message type
 */
function createFallbackNotification(message, type) {
    // Don't create duplicate notifications
    const existing = document.querySelector('.error-utils-notification');
    if (existing) {
        existing.remove();
    }

    const msg = document.createElement('div');
    msg.className = 'error-utils-notification';
    msg.textContent = message.toUpperCase();
    msg.style.cssText = `
        position: fixed;
        top: 60px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#ff4444' : type === 'warning' ? '#ffaa44' : '#4444ff'};
        color: white;
        padding: 10px 20px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 14px;
        border-radius: 4px;
        z-index: 10001;
        animation: errorUtilsFadeInOut 3s ease-in-out;
        pointer-events: none;
    `;

    // Add keyframes if not already present
    if (!document.querySelector('#errorUtilsKeyframes')) {
        const style = document.createElement('style');
        style.id = 'errorUtilsKeyframes';
        style.textContent = `
            @keyframes errorUtilsFadeInOut {
                0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                15% { opacity: 1; transform: translateX(-50%) translateY(0); }
                85% { opacity: 1; }
                100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
}

/**
 * Wrap an async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context name for error logging
 * @param {boolean} notify - Whether to notify user on error
 * @returns {Function} Wrapped function that catches and logs errors
 */
export function wrapAsync(fn, context, notify = false) {
    return async function(...args) {
        try {
            return await fn.apply(this, args);
        } catch (error) {
            logError(context, error, notify);
            return undefined;
        }
    };
}

/**
 * Wrap a sync function with error handling
 * @param {Function} fn - Function to wrap
 * @param {string} context - Context name for error logging
 * @param {*} fallback - Value to return on error
 * @returns {Function} Wrapped function that catches and logs errors
 */
export function wrapSync(fn, context, fallback = undefined) {
    return function(...args) {
        try {
            return fn.apply(this, args);
        } catch (error) {
            logError(context, error, false);
            return fallback;
        }
    };
}

/**
 * Safe JSON parse with error logging
 * @param {string} jsonString - JSON string to parse
 * @param {string} context - Context for error logging
 * @param {*} fallback - Value to return on parse error
 * @returns {*} Parsed object or fallback value
 */
export function safeJsonParse(jsonString, context, fallback = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        logError(context, `JSON parse failed: ${error.message}`, false);
        return fallback;
    }
}

/**
 * Check if localStorage is available (handles private browsing)
 * @returns {{available: boolean, reason: string|null}}
 */
export function checkLocalStorage() {
    try {
        const testKey = '__errorutils_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return { available: true, reason: null };
    } catch (e) {
        let reason = 'unknown';
        if (e.name === 'QuotaExceededError') {
            reason = 'quota_exceeded';
        } else if (e.name === 'SecurityError' || e.message.includes('access')) {
            reason = 'private_browsing';
        }
        return { available: false, reason };
    }
}

export default {
    logError,
    notifyUser,
    wrapAsync,
    wrapSync,
    safeJsonParse,
    checkLocalStorage,
    getRecentErrors,
    clearErrorLog
};
