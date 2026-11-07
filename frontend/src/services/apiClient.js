import { REQUEST_TIMEOUT_MS } from '../lib/constants';

class ApiError extends Error {
  constructor(message, status, code, fields = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

let onUnauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorizedHandler = handler;
}

export async function apiClient(endpoint, options = {}) {
  const {
    timeout = REQUEST_TIMEOUT_MS,
    signal: userSignal,
    headers = {},
    ...customConfig
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Link user signal if provided
  if (userSignal) {
    userSignal.addEventListener('abort', () => controller.abort());
  }

  const isFormData = customConfig.body instanceof FormData;
  const config = {
    method: 'GET',
    credentials: 'same-origin', // Sends HttpOnly cc_session cookie automatically
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...customConfig,
    signal: controller.signal,
  };

  try {
    const response = await fetch(endpoint, config);
    clearTimeout(timeoutId);

    // 204 No Content
    if (response.status === 204) {
      return null;
    }

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
      data = await response.json();
    }

    if (!response.ok) {
      const status = response.status;
      const errorObj = data?.error || {};
      const code = errorObj.code || 'error';
      const fields = errorObj.fields || {};
      let message = errorObj.message;

      // Status-specific friendly fallback messages
      if (status === 401) {
        message = message || 'Session expired. Please log in again.';
        if (typeof onUnauthorizedHandler === 'function') {
          onUnauthorizedHandler();
        }
      } else if (status === 403) {
        message = 'Request forbidden by security policy.';
      } else if (status === 413) {
        message = 'Photos are too large. Please remove a photo and try again.';
      } else if (status === 429) {
        message = 'Too many attempts. Please wait a few minutes and try again.';
      } else if (status >= 500) {
        message = 'Server is currently unavailable. Please try again shortly.';
      } else if (!message) {
        message = 'Something went wrong. Please check your information and try again.';
      }

      throw new ApiError(message, status, code, fields);
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    if (err.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. Please check your internet connection and try again.',
        0,
        'timeout'
      );
    }

    throw new ApiError(
      'Could not reach the server. Check your internet and try again.',
      0,
      'network_error'
    );
  }
}
