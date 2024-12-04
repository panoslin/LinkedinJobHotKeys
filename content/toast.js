function displayToast(status) {
    let toast = document.getElementById('extension-toast');

    // Create toast container if not already present
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'extension-toast';
        toast.className = 'extension-toast';
        document.body.appendChild(toast);
    }

    // Set toast content and style based on status
    if (status === true) {
        toast.innerHTML = `
                <div class="toast-content">MATCH 🎉</div>
            `;
        toast.className = 'extension-toast success';
        hideToastAfterDelay(toast);
    } else if (status === false) {
        toast.innerHTML = `
                <div class="toast-content">MISMATCH 🙁</div>
            `;
        toast.className = 'extension-toast error';
        hideToastAfterDelay(toast);
    } else if (status === 'loading') {
        toast.innerHTML = `
                <div class="toast-content">
                    <div class="toast-spinner"></div>
                    <div>Loading...</div>
                </div>
            `;
        toast.className = 'extension-toast loading';
    } else if (typeof status === 'string') {
        toast.innerHTML = `
                <div class="toast-content">${status}</div>
            `;
        toast.className = 'extension-toast message';
        hideToastAfterDelay(toast);
    } else {
        console.error('Invalid status for toast');
    }

    // Show the toast with animation
    toast.classList.remove('hide');
    toast.classList.add('show');

    // Allow manual dismissal on click
    toast.addEventListener('click', () => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => {
            toast.remove();
        }, 400);
    });
}

function hideToastAfterDelay(toast, delay = 3000) {
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => {
            toast.remove();
        }, 400); // Match this to the fadeOut animation duration
    }, delay);
}
