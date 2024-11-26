document.addEventListener('DOMContentLoaded', () => {
    let chatGPTAccessToken = null;

    const urlParams = new URLSearchParams(window.location.search);
    const fromHome = urlParams.get('fromHome');
    // Only redirect when click on the Home button
    if (!fromHome) {
        // check if 'personalInfo' exists in chrome.storage.local
        chrome.storage.local.get('personalInfo', (result) => {
            const personalInfo = result.personalInfo;
            const condition = personalInfo ? 'true' : 'false';
            if (condition === 'true') {
                window.location.href = 'personal_info.html';
            }
        })
    }
    const manualButton = document.getElementById('go-to-manual');
    manualButton.addEventListener('click', () => {
        window.location.href = 'personal_info.html';
    });

    const form = document.getElementById('chatGPTTokenForm');
    const chatGPTTokenInput = document.getElementById('chatGPTToken');
    const status = document.getElementById('status');
    const uploadResume = document.getElementById('uploadResume');

    // Load any saved token on page load
    chrome.storage.local.get(['chatGPTAccessToken'], (result) => {
        if (result.chatGPTAccessToken) {
            chatGPTTokenInput.value = result.chatGPTAccessToken;
            chatGPTAccessToken = result.chatGPTAccessToken;
            if (!(result.chatGPTAccessToken && result.chatGPTAccessToken.trim() !== '')) {
                uploadResume.disabled = true;
                // add grey color to upload resume button
                uploadResume.style.color = '#808080';
            } else {
                uploadResume.disabled = false;
                uploadResume.style.color = '';
            }
        }
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent page reload
        const token = chatGPTTokenInput.value.trim();

        if (token) {
            chrome.storage.local.set({ chatGPTAccessToken: token }, () => {
                uploadResume.disabled = false;
                uploadResume.style.color = '';
                status.textContent = 'chatGPT Access Token saved!';
                setTimeout(() => {
                    status.textContent = '';
                }, 3000);
                uploadResume.scrollIntoView({ behavior: 'smooth' });
            });
        } else {
            alert('Please enter a valid access token.');
        }
    });

    uploadResume.addEventListener('click', () => {
        // Trigger the hidden file input
        document.getElementById('resumeInput').click();
    });

    document.getElementById('resumeInput').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            // Validate that the file is a PDF
            if (file.type === 'application/pdf') {
                let personalInfo = {};
                const fileReader = new FileReader();
                fileReader.onload = function () {
                    const typedarray = new Uint8Array(this.result);
                    try {
                        extractTextFromPDF(typedarray).then((resumeText) => {
                            if (!chatGPTAccessToken) {
                                alert('Please enter a valid access token.');
                                return;
                            }
                            const redactedResumeText = redactSensitiveInfo(resumeText, personalInfo);
                            extractPersonalInfo(chatGPTAccessToken, resumeText).then((response) => {
                                chrome.storage.local.set({personalInfo: response});
                            })
                            chrome.storage.local.set({resumeText: redactedResumeText});
                        });
                    } catch (error) {
                        alert(error.message);
                    }
                };

                fileReader.readAsArrayBuffer(file);
            } else {
                alert('Please upload a valid PDF file.');
            }
        }
    });

});
