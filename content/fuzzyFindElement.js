function fuzzyFindElement(selector) {
    let element;

    // Define an array of strategies to find the element
    const strategies = [
        // 1. Try selecting by ID directly
        () => document.getElementById(selector),
        () => document.getElementById(selector.replace(/^#/, '')),
        // 2. Try querySelector directly
        () => document.querySelector(selector),
        () => document.querySelector(CSS.escape(selector)),
        // 3. Try matching any attribute's value exactly
        () => [...document.querySelectorAll('input, select, textarea')]
            .find(el => Array.from(el.attributes).some(attr => attr.value === selector)),
        // 4. Try matching any attribute's value contains (partial match)
        () => [...document.querySelectorAll('input, select, textarea')]
            .find(el => Array.from(el.attributes).some(attr => attr.value.includes(selector))),
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
        // 7. Try matching placeholder attribute exactly
        () => document.querySelector(`input[placeholder="${selector}"], textarea[placeholder="${selector}"]`),
        // 8. Try matching placeholder attribute contains (partial match)
        () => [...document.querySelectorAll('input[placeholder], textarea[placeholder]')]
            .find(el => el.placeholder.includes(selector)),
        // 9. Try matching name attribute exactly
        () => document.querySelector(`input[name="${selector}"], select[name="${selector}"], textarea[name="${selector}"]`),
        // 10. Try matching name attribute contains (partial match)
        () => [...document.querySelectorAll('input[name], select[name], textarea[name]')]
            .find(el => el.name.includes(selector)),
        // 11. Try matching data-* attributes
        () => [...document.querySelectorAll('input, select, textarea')]
            .find(el => Array.from(el.attributes).some(attr => attr.name.startsWith('data-') && attr.value.includes(selector))),
        // 12. Try matching aria-label exactly
        () => document.querySelector(`[aria-label="${selector}"]`),
        // 13. Try matching aria-label contains (partial match)
        () => [...document.querySelectorAll('[aria-label]')]
            .find(el => el.getAttribute('aria-label').includes(selector)),
        // 14. Try matching using partial ID match
        () => [...document.querySelectorAll('input[id], select[id], textarea[id]')]
            .find(el => el.id.includes(selector)),
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