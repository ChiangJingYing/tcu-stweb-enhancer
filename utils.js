const Utils = {
    /**
     * Retrieves a single DOM element using an XPath expression.
     * @param {string} xpath - The XPath expression.
     * @param {Node} context - The context node to search from (default: document).
     * @returns {Element|null} The found element or null.
     */
    getElementByXPath: (xpath, context = document) => {
        const doc = (context.nodeType === 9) ? context : context.ownerDocument;
        const result = doc.evaluate(
            xpath,
            context,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        );
        return result.singleNodeValue;
    },

    /**
     * Fetches content from a URL and returns the text.
     * @param {string} url - The URL to fetch.
     * @param {object} options - Fetch options.
     * @returns {Promise<string>} The response text.
     */
    fetchContent: async (url, options = {}) => {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    },

    /**
     * Parses an HTML string into a DOM Document.
     * @param {string} htmlString - The HTML string.
     * @returns {Document} The parsed document.
     */
    parseHTML: (htmlString) => {
        const parser = new DOMParser();
        return parser.parseFromString(htmlString, 'text/html');
    },

    /**
     * Storage wrapper for chrome.storage.local
     */
    Storage: {
        get: (key) => new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => resolve(result[key]));
        }),
        set: (key, value) => new Promise((resolve) => {
            chrome.storage.local.set({ [key]: value }, resolve);
        }),
        remove: (key) => new Promise((resolve) => {
            chrome.storage.local.remove(key, resolve);
        })
    }
};
