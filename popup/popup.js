pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('scripts/pdf.worker.js');

document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', function (e) {
            const ripple = document.createElement('span');
            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
            ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
            ripple.className = 'ripple';
            button.appendChild(ripple);
        });
    });
});

async function extractTextFromPDF(typedarray) {
    try {
        const loadingTask = pdfjsLib.getDocument(typedarray);
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            fullText += pageText + '\n';
        }

        return fullText;
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw error;
    }
}



function redactSensitiveInfo(text, userInfo) {
    const regexPatterns = {
        email: /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi,
        phone: /(\+?\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?)?[\d\s-]{7,15}/g,
        ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
        dob: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
    };

    let redactedText = text;

    // Redact predefined patterns
    for (const key in regexPatterns) {
        redactedText = redactedText.replace(regexPatterns[key], '[REDACTED]');
    }

    // Redact personal information from userInfo
    for (const key in userInfo) {
        if (userInfo[key]) {
            if (key === 'name') {
                // redact first name and last name
                const names = userInfo[key].split(' ');
                const firstNameRegex = new RegExp(`\\b${escapeRegExp(names[0])}\\b`, 'gi');
                const lastNameRegex = new RegExp(`\\b${escapeRegExp(names[names.length - 1])}\\b`, 'gi');
                redactedText = redactedText.replace(firstNameRegex, '[REDACTED]');
                redactedText = redactedText.replace(lastNameRegex, '[REDACTED]');
            } else {
                const escapedValue = escapeRegExp(userInfo[key]);
                const infoRegex = new RegExp(`\\b${escapedValue}\\b`, 'gi');
                redactedText = redactedText.replace(infoRegex, '[REDACTED]');
            }
        }
    }

    return redactedText;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function setThemeBasedOnTime() {
    const body = document.body;
    const hour = new Date().getHours();
    if (hour >= 19 || hour < 6) {
        // Nighttime: 7 PM to 6 AM
        body.setAttribute('data-theme', 'dark');
    } else {
        // Day time: 6 AM to 7 PM
        body.removeAttribute('data-theme');
    }
}

setThemeBasedOnTime();