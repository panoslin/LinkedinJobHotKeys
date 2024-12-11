/**
 * Finds the Lowest Common Ancestor (LCA) of a list of DOM elements.
 *
 * @param {HTMLElement[]} elements - An array of DOM elements.
 * @return {HTMLElement|null} - The LCA element or null if the list is empty.
 */
function findMultipleLCA(elements) {
    if (!elements || elements.length === 0) {
        return null;
    }
    // only one element, return parent
    if (elements.length === 1) {
        return elements[0].parentElement;
    }
    // Function to get the ancestor path from an element up to the root
    function getAncestorPath(element) {
        const ancestors = [];
        while (element) {
            ancestors.unshift(element);
            element = element.parentElement;
        }
        return ancestors;
    }

    // Get the ancestor paths for all elements
    const ancestorPaths = elements.map(getAncestorPath);

    // Find the minimum length among all ancestor paths
    const minLength = Math.min(...ancestorPaths.map(path => path.length));

    let lca = null;

    // Compare ancestors at each level
    for (let i = 0; i < minLength; i++) {
        // Get the ancestor at the current level for all elements
        const currentAncestors = ancestorPaths.map(path => path[i]);

        // Check if all ancestors at this level are the same
        const firstAncestor = currentAncestors[0];
        if (currentAncestors.every(ancestor => ancestor === firstAncestor)) {
            lca = firstAncestor;
        } else {
            // Ancestors diverge at this level
            break;
        }
    }

    return lca;
}

function findLCAElements(labels) {
    const lcaElements = new Set();

    labels.forEach(label => {
        const id = label.getAttribute('for'); // Get the 'for' attribute value
        if (!id) return;

        // Find the corresponding element
        // Try to find the element by ID
        // If not found, try to find the element by 'for' attribute
        // TODO: FUZZY FIND ELEMENT
        const targetElement = document.getElementById(id) ||
            [...document.querySelectorAll('input, select, textarea')]
                .filter(el => Array.from(el.attributes).some(attr => attr.value === id))[0];

        if (!targetElement) return;

        // Find the LCA of the label and the target element
        const lca = findLCA(label, targetElement);
        if (lca) {
            lcaElements.add(lca);
        }
    });

    return lcaElements;
}

function findLCA(node1, node2) {
    // Function to find the LCA of two DOM nodes
    const ancestors1 = getAncestors(node1);
    const ancestors2 = getAncestors(node2);

    for (let ancestor1 of ancestors1) {
        if (ancestors2.includes(ancestor1)) {
            return ancestor1; // The first common ancestor
        }
    }
    return null;
}

function getAncestors(node) {
    const ancestors = [];
    while (node) {
        ancestors.push(node);
        node = node.parentElement;
    }
    return ancestors;
}
