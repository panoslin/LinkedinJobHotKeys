
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('personalInfoForm');
    const status = document.getElementById('status');
    const resumeInput = document.getElementById('resume');

    document.getElementById('homeIcon').addEventListener('click', () => {
        window.location.href = chrome.runtime.getURL('landing.html?fromHome=true');
    });

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

        chrome.runtime.sendMessage({
            action: 'updatePersonalInfo',
        });
    });
});
