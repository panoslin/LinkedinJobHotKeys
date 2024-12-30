function highlightKeywordInDiv(keyword) {
    const targetDiv = document.querySelector(".jobs-box__html-content .mt4");

    if (!targetDiv) {
        console.warn("Target div not found.");
        return;
    }

    // Remove existing highlights
    const removeHighlights = (node) => {
        if (
            node.nodeType === Node.ELEMENT_NODE &&
            node.classList.contains("highlighted")
        ) {
            const parent = node.parentNode;
            while (node.firstChild) {
                parent.insertBefore(node.firstChild, node);
            }
            parent.removeChild(node);
        } else if (
            node.nodeType === Node.ELEMENT_NODE ||
            node.nodeType === Node.DOCUMENT_FRAGMENT_NODE
        ) {
            Array.from(node.childNodes).forEach(removeHighlights);
        }
    };
    removeHighlights(targetDiv);

    // Escape special characters in the keyword
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedKeyword})`, "gi"); // Case-insensitive match

    // Highlight matches in text nodes
    const highlightMatches = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const matches = node.textContent.match(regex);
            if (matches) {
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;

                matches.forEach((match) => {
                    const matchIndex = node.textContent
                        .toLowerCase()
                        .indexOf(match.toLowerCase(), lastIndex);
                    if (matchIndex >= lastIndex) {
                        // Append text before the match
                        fragment.appendChild(
                            document.createTextNode(
                                node.textContent.substring(
                                    lastIndex,
                                    matchIndex,
                                ),
                            ),
                        );

                        // Create a span for the match
                        const span = document.createElement("span");
                        span.className = "highlighted";
                        span.textContent = node.textContent.substring(
                            matchIndex,
                            matchIndex + match.length,
                        );
                        fragment.appendChild(span);

                        lastIndex = matchIndex + match.length;
                    }
                });

                // Append remaining text
                fragment.appendChild(
                    document.createTextNode(
                        node.textContent.substring(lastIndex),
                    ),
                );

                // Replace the original text node with the fragment
                node.replaceWith(fragment);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (
                node.classList.contains("keyword") ||
                node.classList.contains("tooltip") ||
                node.classList.contains("summary")
            ) {
                return;
            }
            Array.from(node.childNodes).forEach(highlightMatches);
        }
    };
    highlightMatches(targetDiv);

    // Scroll to the first match
    const matches = targetDiv.querySelectorAll(".highlighted");
    for (let i = 0; i < matches.length; i++) {
        if (
            !matches[i].classList.contains("keyword") &&
            !matches[i].classList.contains("tooltip") &&
            !matches[i].classList.contains("summary")
        ) {
            matches[i].scrollIntoView({behavior: "smooth", block: "center"});
            break;
        }
    }
}

// function createKeyword(keyword, isMatch) {
//     const keywordSpan = document.createElement('span');
//     keywordSpan.classList.add('keyword');
//     if (keyword.length === 0 || keyword[0].length > 60) {
//         // too long, not valid keyword
//         return null;
//     }
//     keywordSpan.textContent = keyword;

//     // // Create a tooltip
//     // if (keyword[1] && keyword[1].length <= 200) {
//     //     const tooltip = document.createElement('div');
//     //     tooltip.classList.add('tooltip');
//     //     tooltip.textContent = keyword[1];

//     //     keywordSpan.appendChild(tooltip);
//     //     // Show and hide tooltip on hover
//     //     keywordSpan.addEventListener('mouseover', () => {
//     //         tooltip.style.visibility = 'visible';
//     //         tooltip.style.opacity = '1';
//     //     });
//     //     keywordSpan.addEventListener('mouseout', () => {
//     //         tooltip.style.visibility = 'hidden';
//     //         tooltip.style.opacity = '0';
//     //     });

//     // }

//     keywordSpan.addEventListener('click', () => {
//         highlightKeywordInDiv(keyword);
//     });
//     return keywordSpan;
// }
