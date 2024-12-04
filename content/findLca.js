function findLCAElements(labels) {
    const lcaElements = new Set();

    labels.forEach(label => {
        const id = label.getAttribute('for'); // Get the 'for' attribute value
        if (!id) return;

        // Find the corresponding element
        // Try to find the element by ID
        // If not found, try to find the element by 'for' attribute
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
