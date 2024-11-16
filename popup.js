pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.js');


document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('personalInfoForm');
    const status = document.getElementById('status');
    const resumeInput = document.getElementById('resume');

    // Load saved data and populate the form
    chrome.storage.local.get('personalInfo', (result) => {
        if (result.personalInfo) {
            Object.entries(result.personalInfo).forEach(([key, value]) => {
                if (key !== 'resume') {
                    const input = document.getElementById(key);
                    if (input) input.value = value;
                }
            });
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        let formData = new FormData(form);
        let personalInfo = {};
        formData.forEach((value, key) => {
            if (key === 'resume') {
                // personalInfo[key] = resumeInput.files[0].name;
            } else {
                personalInfo[key] = value;
            }
        });

        chrome.storage.local.set({personalInfo}, () => {
            status.textContent = 'Personal information saved!';
            setTimeout(() => {
                status.textContent = '';
            }, 3000);
        });

        if (resumeInput.files.length > 0) {
            const file = resumeInput.files[0];

            if (file.type !== 'application/pdf') {
                alert('Please upload a PDF file.');
                return;
            }

            const fileReader = new FileReader();

            fileReader.onload = function () {
                const typedarray = new Uint8Array(this.result);

                extractTextFromPDF(typedarray).then((resumeText) => {
                    const reductedResumeText = redactSensitiveInfo(resumeText, personalInfo);
                    chrome.storage.local.set({resumeText: reductedResumeText}, function () {
                        console.log(reductedResumeText);
                    });
                });
            };

            fileReader.readAsArrayBuffer(file);
        }
    });
});

async function extractTextFromPDF(typedarray) {
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

