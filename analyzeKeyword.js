function highlightKeywordInDiv(keyword) {
    const targetDiv = document.querySelector('.jobs-box__html-content .mt4'); // Replace with your actual target div's class or ID

    if (!targetDiv) {
        console.warn('Target div not found.');
        return;
    }

    // Remove existing highlights
    document.querySelectorAll('.highlighted').forEach((el) => {
        el.classList.remove('highlighted');
    });

    // Find and highlight the text
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special characters
    const regex = new RegExp(`(${escapedKeyword})`, 'gi'); // Case-insensitive match
    targetDiv.innerHTML = targetDiv.innerHTML.replace(regex, '<span class="highlighted">$1</span>');

    // Scroll to the first match
    const matches = targetDiv.querySelectorAll('.highlighted');
    for (let i = 0; i < matches.length; i++) {
        if (!matches[i].classList.contains('keyword')) {
            matches[i].scrollIntoView({behavior: 'smooth', block: 'center'});
            break;
        }
    }
}