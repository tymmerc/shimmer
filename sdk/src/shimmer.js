/**
 * Shimmer SDK v1.0.0
 * JavaScript SDK for the Shimmer e-commerce AI platform.
 *
 * UMD module — works as <script> tag (window.Shimmer) and as CommonJS/ESM import.
 *
 * @example
 * // Script tag
 * <script src="shimmer.min.js"></script>
 * <script>
 *   Shimmer.init({ apiUrl: 'https://example.com/shimmer/api', apiKey: 'sk_...', storeId: 1 });
 *   const results = await Shimmer.search('perceuse sans fil');
 * </script>
 *
 * @example
 * // ESM / CommonJS
 * import { Shimmer } from '@shimmer/sdk';
 * // or: const { Shimmer } = require('@shimmer/sdk');
 * Shimmer.init({ apiUrl: '...', apiKey: '...', storeId: 1 });
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Shimmer = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ── ShimmerError ──────────────────────────────────────────────────────────

  /**
   * Custom error class for Shimmer SDK errors.
   * @extends Error
   */
  class ShimmerError extends Error {
    /**
     * @param {string} message - Error message
     * @param {number} [status] - HTTP status code (if from API)
     * @param {string} [code] - Machine-readable error code
     * @param {*} [details] - Additional error details (e.g. validation errors)
     */
    constructor(message, status, code, details) {
      super(message);
      this.name = 'ShimmerError';
      /** @type {number|undefined} HTTP status code */
      this.status = status;
      /** @type {string|undefined} Machine-readable error code */
      this.code = code;
      /** @type {*} Additional error details */
      this.details = details;
    }
  }

  // ── Internal State ────────────────────────────────────────────────────────

  /** @type {{ apiUrl: string, apiKey: string, storeId: number }|null} */
  var _config = null;

  /** @type {Object.<string, Function[]>} */
  var _listeners = {};

  /** @type {{ history: Array<{role: string, content: string}>, knownCriteria: Object.<string, string>, sessionToken: string|null }} */
  var _assistantState = {
    history: [],
    knownCriteria: {},
    sessionToken: null,
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Emit an event to all registered listeners.
   * @param {string} event
   * @param {*} data
   */
  function _emit(event, data) {
    var cbs = _listeners[event];
    if (cbs) {
      for (var i = 0; i < cbs.length; i++) {
        try {
          cbs[i](data);
        } catch (e) {
          /* listener errors should not break the SDK */
        }
      }
    }
  }

  /**
   * Ensure the SDK has been initialized.
   * @throws {ShimmerError}
   */
  function _requireInit() {
    if (!_config) {
      throw new ShimmerError(
        'Shimmer SDK not initialized. Call Shimmer.init() first.',
        undefined,
        'NOT_INITIALIZED'
      );
    }
  }

  /**
   * Build full URL for an API path.
   * @param {string} path - e.g. '/api/search'
   * @returns {string}
   */
  function _url(path) {
    var base = _config.apiUrl.replace(/\/+$/, '');
    return base + path;
  }

  /**
   * Internal HTTP request helper.
   * @param {string} method - HTTP method
   * @param {string} path - API path (e.g. '/api/search')
   * @param {Object} [body] - Request body for POST
   * @param {Object} [queryParams] - Query string parameters for GET
   * @returns {Promise<*>}
   */
  async function _request(method, path, body, queryParams) {
    _requireInit();

    var url = _url(path);
    if (queryParams) {
      var qs = [];
      for (var key in queryParams) {
        if (queryParams[key] !== undefined && queryParams[key] !== null) {
          qs.push(encodeURIComponent(key) + '=' + encodeURIComponent(queryParams[key]));
        }
      }
      if (qs.length) url += '?' + qs.join('&');
    }

    var options = {
      method: method,
      headers: {
        'Authorization': 'Bearer ' + _config.apiKey,
      },
    };

    if (body !== undefined && body !== null) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    var response;
    try {
      response = await fetch(url, options);
    } catch (err) {
      var networkError = new ShimmerError(
        'Network error: ' + (err.message || 'fetch failed'),
        undefined,
        'NETWORK_ERROR'
      );
      _emit('error', networkError);
      throw networkError;
    }

    var data;
    try {
      data = await response.json();
    } catch (_) {
      data = null;
    }

    if (!response.ok) {
      var apiError = new ShimmerError(
        (data && data.error) || 'HTTP ' + response.status,
        response.status,
        'API_ERROR',
        data && data.details
      );
      _emit('error', apiError);
      throw apiError;
    }

    return data;
  }

  // ── Assistant (vendeur IA) sub-module ────────────────────────────────────

  /**
   * AI Sales Assistant — multi-turn conversational product guidance.
   * Manages conversation history and known criteria internally.
   * @namespace
   */
  var assistant = {
    /**
     * Send a message to the AI sales assistant.
     * Conversation history and qualification criteria are managed automatically.
     *
     * @param {string} message - The user's message
     * @param {Object} [options] - Additional options
     * @param {string} [options.sessionToken] - Override session token (otherwise managed internally)
     * @returns {Promise<{
     *   message: string,
     *   suggestedQuestions: string[],
     *   highlightedProducts: Array<{name: string, reason: string, price?: string}>,
     *   needsMoreInfo: boolean,
     *   qualificationStep: string,
     *   sessionToken: string,
     *   knownCriteria: Object.<string, string>,
     *   qualification: { universe: string|null, score: number, missingRequired: boolean },
     *   searchMeta: { totalProducts: number, stageUsed: string, searchType: string, totalMs: number }
     * }>}
     * @throws {ShimmerError}
     */
    chat: async function (message, options) {
      _requireInit();
      options = options || {};

      var body = {
        message: message,
        sessionToken: options.sessionToken || _assistantState.sessionToken || undefined,
        history: _assistantState.history.slice(-10),
        knownCriteria: _assistantState.knownCriteria,
      };

      var result = await _request('POST', '/api/search/assist', body);

      // Update internal state
      _assistantState.history.push({ role: 'user', content: message });
      _assistantState.history.push({ role: 'assistant', content: result.message });
      if (result.sessionToken) _assistantState.sessionToken = result.sessionToken;
      if (result.knownCriteria) _assistantState.knownCriteria = result.knownCriteria;

      _emit('assistant', result);
      return result;
    },

    /**
     * Reset the assistant conversation state.
     * Clears history, known criteria, and session token.
     */
    reset: function () {
      _assistantState = {
        history: [],
        knownCriteria: {},
        sessionToken: null,
      };
    },

    /**
     * Get current assistant state (read-only snapshot).
     * @returns {{ history: Array<{role: string, content: string}>, knownCriteria: Object.<string, string>, sessionToken: string|null }}
     */
    getState: function () {
      return {
        history: _assistantState.history.slice(),
        knownCriteria: Object.assign({}, _assistantState.knownCriteria),
        sessionToken: _assistantState.sessionToken,
      };
    },
  };

  // ── Reviews sub-module ───────────────────────────────────────────────────

  /**
   * Reviews management — list, submit, and get stats.
   * @namespace
   */
  var reviews = {
    /**
     * Get reviews for a specific product.
     *
     * @param {number} productId - The product ID
     * @param {Object} [options] - Pagination options
     * @param {number} [options.limit=20] - Number of reviews per page (max 50)
     * @param {number} [options.offset=0] - Offset for pagination
     * @returns {Promise<{ reviews: Array, total: number }>}
     * @throws {ShimmerError}
     */
    list: async function (productId, options) {
      _requireInit();
      options = options || {};
      var params = {};
      if (options.limit !== undefined) params.limit = options.limit;
      if (options.offset !== undefined) params.offset = options.offset;
      return _request('GET', '/api/reviews/product/' + productId, null, params);
    },

    /**
     * Submit a product review using a review token.
     * The token is obtained from the review questionnaire link.
     *
     * @param {string} token - Review request token
     * @param {Object} data - Review data
     * @param {number} data.overallRating - Overall rating (1-5)
     * @param {Array<{productId: number, rating: number}>} [data.productRatings] - Per-product ratings
     * @param {number} [data.deliveryRating] - Delivery rating (1-5)
     * @param {number} [data.serviceRating] - Service rating (1-5)
     * @param {string} [data.title] - Review title (max 200 chars)
     * @param {string} [data.comment] - Review comment (max 5000 chars)
     * @param {string} [data.pros] - Pros (max 2000 chars)
     * @param {string} [data.cons] - Cons (max 2000 chars)
     * @param {boolean} [data.wouldRecommend] - Would recommend this product
     * @returns {Promise<Object>}
     * @throws {ShimmerError}
     */
    submit: async function (token, data) {
      _requireInit();
      var body = Object.assign({}, data, { token: token });
      return _request('POST', '/api/reviews/submit', body);
    },

    /**
     * Get review statistics for the store or a specific product.
     *
     * @param {number} [productId] - Optional product ID (omit for store-wide stats)
     * @returns {Promise<{ averageRating: number, totalReviews: number, recommendRate: number, distribution: Object }>}
     * @throws {ShimmerError}
     */
    stats: async function (productId) {
      _requireInit();
      var params = {};
      if (productId !== undefined) params.productId = productId;
      return _request('GET', '/api/reviews/stats', null, params);
    },

    /**
     * Get the questionnaire data for a review token (public endpoint).
     *
     * @param {string} token - Review request token
     * @returns {Promise<{ token: string, customerName: string, orderNumber: string, products: Array, status: string }>}
     * @throws {ShimmerError}
     */
    questionnaire: async function (token) {
      _requireInit();
      return _request('GET', '/api/reviews/questionnaire/' + encodeURIComponent(token));
    },
  };

  // ── Mail sub-module ──────────────────────────────────────────────────────

  /**
   * Email classification and AI response drafting.
   * @namespace
   */
  var mail = {
    /**
     * Classify an email and generate an AI draft response.
     * Full pipeline: classify + draft + queue for human validation.
     *
     * @param {Object} email - Email data
     * @param {string} email.fromAddr - Sender email address
     * @param {string} email.subject - Email subject (max 500 chars)
     * @param {string} email.body - Email body (max 10000 chars)
     * @param {string} [email.externalId] - External ID for tracking (max 200 chars)
     * @returns {Promise<Object>} Classification result with draft
     * @throws {ShimmerError}
     */
    classify: async function (email) {
      _requireInit();
      return _request('POST', '/api/mail/classify', email);
    },
  };

  // ── Public API ────────────────────────────────────────────────────────────

  var Shimmer = {
    /**
     * SDK version string.
     * @type {string}
     */
    version: '1.0.0',

    /**
     * Custom error class for SDK errors.
     * @type {typeof ShimmerError}
     */
    ShimmerError: ShimmerError,

    /**
     * Initialize the Shimmer SDK with your API credentials.
     * Must be called before any other method.
     *
     * @param {Object} config - Configuration object
     * @param {string} config.apiUrl - Base URL of the Shimmer API (e.g. 'https://example.com/shimmer/api')
     * @param {string} config.apiKey - Your store API key (Bearer token)
     * @param {number} config.storeId - Your store ID
     * @returns {Object} The Shimmer SDK instance (for chaining)
     * @throws {ShimmerError} If required config parameters are missing
     *
     * @example
     * Shimmer.init({
     *   apiUrl: 'https://tymmerc.eu/shimmer/api',
     *   apiKey: 'sk_live_abc123',
     *   storeId: 1
     * });
     */
    init: function (config) {
      if (!config || !config.apiUrl || !config.apiKey || !config.storeId) {
        throw new ShimmerError(
          'Shimmer.init() requires { apiUrl, apiKey, storeId }',
          undefined,
          'INVALID_CONFIG'
        );
      }
      _config = {
        apiUrl: config.apiUrl,
        apiKey: config.apiKey,
        storeId: config.storeId,
      };
      // Reset assistant state on re-init
      assistant.reset();
      // Clear event listeners
      _listeners = {};
      return Shimmer;
    },

    /**
     * Search for products using AI-powered search.
     *
     * @param {string} query - Search query (1-500 chars)
     * @param {Object} [filters] - Optional search filters
     * @param {string} [filters.category] - Filter by category
     * @param {string} [filters.brand] - Filter by brand
     * @param {number} [filters.minPrice] - Minimum price
     * @param {number} [filters.maxPrice] - Maximum price
     * @param {boolean} [filters.inStock] - Only show in-stock products
     * @param {string} [filters.searchType] - Search type: 'EXACT', 'FUNCTIONAL', 'SIMILARITY', or 'HYBRID'
     * @param {string} [filters.sessionToken] - Session token for search continuity
     * @returns {Promise<Object>} Search results with products, searchType, sessionToken
     * @throws {ShimmerError}
     *
     * @example
     * const results = await Shimmer.search('perceuse sans fil', { maxPrice: 100, inStock: true });
     * console.log(results.products);
     */
    search: async function (query, filters) {
      _requireInit();
      var body = { query: query };
      if (filters) {
        if (filters.searchType) body.searchType = filters.searchType;
        if (filters.sessionToken) body.sessionToken = filters.sessionToken;
        var filterObj = {};
        if (filters.category !== undefined) filterObj.category = filters.category;
        if (filters.brand !== undefined) filterObj.brand = filters.brand;
        if (filters.minPrice !== undefined) filterObj.minPrice = filters.minPrice;
        if (filters.maxPrice !== undefined) filterObj.maxPrice = filters.maxPrice;
        if (filters.inStock !== undefined) filterObj.inStock = filters.inStock;
        if (Object.keys(filterObj).length > 0) body.filters = filterObj;
      }
      var result = await _request('POST', '/api/search', body);
      _emit('search', result);
      return result;
    },

    /**
     * Refine a previous search within the same session.
     *
     * @param {string} sessionToken - Session token from a previous search
     * @param {string} query - Refined search query
     * @param {Object.<string, string>} [answer] - Answers to qualification questions
     * @returns {Promise<Object>} Refined search results
     * @throws {ShimmerError}
     */
    refineSearch: async function (sessionToken, query, answer) {
      _requireInit();
      var body = { sessionToken: sessionToken, query: query };
      if (answer) body.answer = answer;
      var result = await _request('POST', '/api/search/refine', body);
      _emit('search', result);
      return result;
    },

    /**
     * Get a search session by its token.
     *
     * @param {string} sessionId - The session token
     * @returns {Promise<Object>} Session data
     * @throws {ShimmerError}
     */
    getSearchSession: async function (sessionId) {
      _requireInit();
      return _request('GET', '/api/search/session/' + encodeURIComponent(sessionId));
    },

    /**
     * AI Sales Assistant sub-module.
     * Manages multi-turn conversation with automatic history and criteria tracking.
     * @type {{ chat: Function, reset: Function, getState: Function }}
     */
    assistant: assistant,

    /**
     * Reviews sub-module.
     * @type {{ list: Function, submit: Function, stats: Function, questionnaire: Function }}
     */
    reviews: reviews,

    /**
     * Mail classification sub-module.
     * @type {{ classify: Function }}
     */
    mail: mail,

    /**
     * Send search feedback (click, purchase, return, validation).
     *
     * @param {Object} feedback - Feedback data
     * @param {number} feedback.searchSessionId - The search session ID
     * @param {string} feedback.type - Feedback type: 'click', 'purchase', 'return', or 'validation'
     * @param {number} [feedback.productId] - Product ID related to the feedback
     * @param {string} [feedback.usageCode] - Usage code for validation feedback
     * @param {boolean} [feedback.validated] - Whether the result was validated
     * @param {string} [feedback.correction] - Correction text if result was wrong
     * @returns {Promise<{ status: string }>}
     * @throws {ShimmerError}
     */
    feedback: async function (feedback) {
      _requireInit();
      return _request('POST', '/api/feedback', feedback);
    },

    /**
     * Get search analytics for your store.
     *
     * @param {Object} [options] - Options
     * @param {number} [options.days=7] - Number of days to look back
     * @returns {Promise<{
     *   period: { days: number, since: string },
     *   totalSearches: number,
     *   conversionRate: number,
     *   byType: Array<{type: string, count: number}>,
     *   byStage: Array<{stage: string, count: number}>,
     *   topQueries: Array<{query: string, count: number}>
     * }>}
     * @throws {ShimmerError}
     */
    stats: async function (options) {
      _requireInit();
      var params = {};
      if (options && options.days !== undefined) params.days = options.days;
      return _request('GET', '/api/analytics/search', null, params);
    },

    /**
     * Check API health status. Does not require authentication.
     *
     * @returns {Promise<{ status: string, timestamp: string }>}
     * @throws {ShimmerError}
     */
    health: async function () {
      _requireInit();
      // Health endpoint has no auth, but we still use the configured base URL
      var url = _config.apiUrl.replace(/\/+$/, '') + '/health';
      var response;
      try {
        response = await fetch(url);
      } catch (err) {
        throw new ShimmerError(
          'Network error: ' + (err.message || 'fetch failed'),
          undefined,
          'NETWORK_ERROR'
        );
      }
      return response.json();
    },

    /**
     * Register an event listener.
     * Supported events: 'search', 'assistant', 'error'
     *
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Object} The Shimmer SDK instance (for chaining)
     *
     * @example
     * Shimmer.on('search', (results) => console.log('Search:', results));
     * Shimmer.on('error', (err) => console.error('Error:', err.message, err.status));
     * Shimmer.on('assistant', (response) => console.log('Assistant:', response.message));
     */
    on: function (event, callback) {
      if (typeof callback !== 'function') {
        throw new ShimmerError('Callback must be a function', undefined, 'INVALID_ARGUMENT');
      }
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(callback);
      return Shimmer;
    },

    /**
     * Remove an event listener.
     *
     * @param {string} event - Event name
     * @param {Function} callback - The exact callback function to remove
     * @returns {Object} The Shimmer SDK instance (for chaining)
     */
    off: function (event, callback) {
      var cbs = _listeners[event];
      if (cbs) {
        _listeners[event] = cbs.filter(function (cb) { return cb !== callback; });
      }
      return Shimmer;
    },

    /**
     * Check if the SDK has been initialized.
     * @returns {boolean}
     */
    isInitialized: function () {
      return _config !== null;
    },

    /**
     * Tear down the SDK — clears config, listeners, and assistant state.
     */
    destroy: function () {
      _config = null;
      _listeners = {};
      assistant.reset();
    },
  };

  return Shimmer;
});
