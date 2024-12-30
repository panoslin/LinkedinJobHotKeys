function fuzzyFindElement(selector) {
    let element;

    // Define an array of strategies to find the element
    const strategies = [
        // 1. Try selecting by ID directly
        () => document.getElementById(selector),
        () => document.getElementById(selector.replace(/^#/, '')),
        () => document.getElementById(reverseCssEscape(selector)),
        () => document.getElementById(reverseCssEscape(selector.replace(/^#/, ''))),
        // 2. Try querySelector directly
        () => document.querySelector(selector),
        () => document.querySelector(CSS.escape(selector)),
        () => document.querySelector(reverseCssEscape(selector)),
        () => document.querySelector(CSS.escape(reverseCssEscape(selector))),
        // 3. Try matching any attribute's value exactly
        () => [...document.querySelectorAll('input, select, textarea')]
            .find(el => Array.from(el.attributes).some(attr => attr.value === selector)),
        () => [...document.querySelectorAll('input, select, textarea')]
            .find(el => Array.from(el.attributes).some(attr => attr.value === reverseCssEscape(selector))),
        // 4. Try matching any attribute's value contains (partial match)
        () => [...document.querySelectorAll('input, select, textarea')]
            .find(el => Array.from(el.attributes).some(attr => attr.value.includes(selector))),
        () => [...document.querySelectorAll('input, select, textarea')]
            .find(el => Array.from(el.attributes).some(attr => attr.value.includes(reverseCssEscape(selector)))),
        // 5. Try matching label's text content exactly
        () => {
            const label = [...document.querySelectorAll('label')]
                .find(lbl => lbl.textContent.trim() === selector);
            if (label && label.htmlFor) {
                return document.getElementById(label.htmlFor);
            } else if (label) {
                // If label encloses the input
                return label.querySelector('input, select, textarea');
            }
        },
        () => {
            const label = [...document.querySelectorAll('label')]
                .find(lbl => lbl.textContent.trim() === reverseCssEscape(selector));
            if (label && label.htmlFor) {
                return document.getElementById(label.htmlFor);
            } else if (label) {
                // If label encloses the input
                return label.querySelector('input, select, textarea');
            }
        },
        // 6. Try matching label's text content contains (partial match)
        () => {
            const label = [...document.querySelectorAll('label')]
                .find(lbl => lbl.textContent.trim().includes(selector));
            if (label && label.htmlFor) {
                return document.getElementById(label.htmlFor);
            } else if (label) {
                return label.querySelector('input, select, textarea');
            }
        },
        () => {
            const label = [...document.querySelectorAll('label')]
                .find(lbl => lbl.textContent.trim().includes(reverseCssEscape(selector)));
            if (label && label.htmlFor) {
                return document.getElementById(label.htmlFor);
            } else if (label) {
                return label.querySelector('input, select, textarea');
            }
        },
        // 7. Try matching placeholder attribute exactly
        () => document.querySelector(`input[placeholder="${selector}"], textarea[placeholder="${selector}"]`),
        () => document.querySelector(`input[placeholder="${reverseCssEscape(selector)}"], textarea[placeholder="${reverseCssEscape(selector)}"]`),
        // 8. Try matching placeholder attribute contains (partial match)
        () => [...document.querySelectorAll('input[placeholder], textarea[placeholder]')]
            .find(el => el.placeholder.includes(selector)),
        () => [...document.querySelectorAll('input[placeholder], textarea[placeholder]')]
            .find(el => el.placeholder.includes(reverseCssEscape(selector))),
        // 9. Try matching name attribute exactly
        () => document.querySelector(`input[name="${selector}"], select[name="${selector}"], textarea[name="${selector}"]`),
        () => document.querySelector(`input[name="${reverseCssEscape(selector)}"], select[name="${reverseCssEscape(selector)}"], textarea[name="${reverseCssEscape(selector)}"]`),
        // 10. Try matching name attribute contains (partial match)
        () => [...document.querySelectorAll('input[name], select[name], textarea[name]')]
            .find(el => el.name.includes(selector)),
        () => [...document.querySelectorAll('input[name], select[name], textarea[name]')]
            .find(el => el.name.includes(reverseCssEscape(selector))),
        // 11. Try matching data-* attributes
        () => [...document.querySelectorAll('input, select, textarea')]
            .find(el => Array.from(el.attributes).some(attr => attr.name.startsWith('data-') && attr.value.includes(selector))),
        () => [...document.querySelectorAll('input, select, textarea')]
            .find(el => Array.from(el.attributes).some(attr => attr.name.startsWith('data-') && attr.value.includes(reverseCssEscape(selector)))),
        // 12. Try matching aria-label exactly
        () => document.querySelector(`[aria-label="${selector}"]`),
        () => document.querySelector(`[aria-label="${reverseCssEscape(selector)}"]`),
        // 13. Try matching aria-label contains (partial match)
        () => [...document.querySelectorAll('[aria-label]')]
            .find(el => el.getAttribute('aria-label').includes(selector)),
        () => [...document.querySelectorAll('[aria-label]')]
            .find(el => el.getAttribute('aria-label').includes(reverseCssEscape(selector))),
        // 14. Try matching using partial ID match
        () => [...document.querySelectorAll('input[id], select[id], textarea[id]')]
            .find(el => el.id.includes(selector)),
        () => [...document.querySelectorAll('input[id], select[id], textarea[id]')]
            .find(el => el.id.includes(reverseCssEscape(selector))),
        () => matchByHTML(selector),
        () => matchByHTML(reverseCssEscape(selector)),
        () => matchByHTML(selector.replace(/^#/, '')),
        () => matchByHTML(reverseCssEscape(selector.replace(/^#/, ''))),
    ];

    // Iterate over strategies until an element is found
    for (let strategy of strategies) {
        try {
            element = strategy();
            if (element) break;
        } catch (error) {
            // Ignore errors and try next strategy
        }
    }

    return element;
}

function reverseCssEscape(escapedString) {
    return escapedString.replace(/\\([0-9a-fA-F]{1,6}\s?|.)/g, (match, char) => {
        if (char.length === 1) {
            // If it's a single character, just return it
            return char;
        } else if (/\s/.test(char[char.length - 1])) {
            // If it ends with a space, remove the space
            char = char.slice(0, -1);
        }
        // Convert hex code to character
        return String.fromCodePoint(parseInt(char, 16));
    });
}

function matchByHTML(searchString) {
    // Early return if searchString is empty or invalid
    if (!searchString?.trim()) {
        return null;
    }

    const trimmedSearchString = searchString.trim();

    // For exact HTML matches, try direct match first
    if (trimmedSearchString.startsWith('<') && trimmedSearchString.includes('id="')) {
        // Extract ID from the search string
        const idMatch = trimmedSearchString.match(/id="([^"]+)"/);
        if (idMatch && idMatch[1]) {
            const elementById = document.getElementById(idMatch[1]);
            if (elementById) {
                return elementById;
            }
        }
    }

    // Use more specific selectors when possible to reduce search space
    const elements = document.querySelectorAll('select, input, textarea, button, a, label, [role="button"]');

    let bestMatch = null;
    let bestScore = 0;

    for (const element of elements) {
        // Skip hidden elements
        if (!element.offsetParent || element.hidden ||
            window.getComputedStyle(element).display === 'none') {
            continue;
        }

        const elementHTML = element.outerHTML;

        // Calculate match score based on multiple factors
        let score = 0;

        // Exact HTML match gets highest priority
        if (elementHTML === trimmedSearchString) {
            return element; // Immediate return for exact match
        }

        // Exact ID match gets next highest priority
        if (element.id && trimmedSearchString.includes(`id="${element.id}"`)) {
            score += 1000;
        }

        // Partial HTML match score
        if (elementHTML.includes(trimmedSearchString) ||
            trimmedSearchString.includes(elementHTML)) {
            score += 500;
            // Bonus for closer length match
            score += (1000 / Math.abs(elementHTML.length - trimmedSearchString.length));
        }

        // Attribute matches
        const elementAttrs = element.attributes;
        for (const attr of elementAttrs) {
            if (trimmedSearchString.includes(`${attr.name}="${attr.value}"`)) {
                score += 100;
            }
        }

        // Tag name match
        const tagMatch = trimmedSearchString.match(/<(\w+)/);
        if (tagMatch && element.tagName.toLowerCase() === tagMatch[1].toLowerCase()) {
            score += 50;
        }

        // Bonus for select elements when searching for select
        if (trimmedSearchString.includes('<select') && element.tagName === 'SELECT') {
            score += 30;
        }

        // Bonus for visible elements in viewport
        const rect = element.getBoundingClientRect();
        if (rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth) {
            score += 10;
        }

        // Update best match if current score is higher
        if (score > bestScore) {
            bestMatch = element;
            bestScore = score;
        }
    }

    return bestMatch;
}
