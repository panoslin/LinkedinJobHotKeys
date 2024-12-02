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
                window.location.href = '../personal-info/personal_info.html';
            }
        })
    }
    const manualButton = document.getElementById('go-to-manual');
    manualButton.addEventListener('click', () => {
        window.location.href = '../personal-info/personal_info.html';
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
        chatGPTAccessToken = token;
        chrome.storage.local.set({chatGPTAccessToken: token}, () => {
            status.textContent = 'chatGPT Access Token saved!';
            setTimeout(() => {
                status.textContent = '';
            }, 3000);
            if (token) {
                uploadResume.disabled = false;
                uploadResume.style.color = '';
            }
            uploadResume.scrollIntoView({behavior: 'smooth'});

        });
    });

    uploadResume.addEventListener('click', () => {
        // Trigger the hidden file input
        document.getElementById('resumeInput').click();
    });

    document.getElementById('resumeInput').addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            // Validate that the file is a PDF
            if (file.type === 'application/pdf') {
                // Show the spinner
                const uploadResumeSpinner = document.getElementById('uploadResumeSpinner');
                const uploadResumeText = document.getElementById('uploadResumeText');
                uploadResumeSpinner.style.display = 'inline-block';
                uploadResumeText.textContent = 'Uploading...';
                try {
                    const personalInfo = await new Promise((resolve) => {
                        chrome.storage.local.get('personalInfo', (result) => {
                            resolve(result.personalInfo || {});
                        });
                    });

                    const fileReader = new FileReader();
                    fileReader.onload = async function () {
                        const typedarray = new Uint8Array(this.result);
                        try {
                            const resumeText = await extractTextFromPDF(typedarray);

                            if (!chatGPTAccessToken) {
                                alert('Please enter a valid access token.');
                                return;
                            }

                            uploadResumeText.textContent = 'Extracting Information ...';
                            const [summarizedResume, extractedInfo] = await Promise.all([
                                summarizeResume(chatGPTAccessToken, resumeText),
                                extractPersonalInfo(chatGPTAccessToken, resumeText)
                            ]);

                            personalInfo.summarizedResume = JSON.stringify(summarizedResume);

                            for (const [key, value] of Object.entries(extractedInfo)) {
                                personalInfo[key] = value || personalInfo[key];
                            }

                            await new Promise((resolve) => {
                                chrome.storage.local.set({personalInfo: personalInfo}, resolve);
                            });

                            const redactedResumeText = redactSensitiveInfo(resumeText, personalInfo);
                            await new Promise((resolve) => {
                                chrome.storage.local.set({resumeText: redactedResumeText}, resolve);
                            });

                            // Redirect to 'personal_info.html' after all operations are complete
                            window.location.href = '../personal-info/personal_info.html';

                        } catch (error) {
                            alert(error.message);
                        } finally {
                            // Hide the spinner
                            uploadResumeSpinner.style.display = 'none';
                            uploadResumeText.textContent = 'Upload Resume';
                        }
                    };

                    fileReader.readAsArrayBuffer(file);
                } catch (error) {
                    alert('An error occurred while processing the file.');
                    // Hide the spinner in case of error
                    uploadResumeSpinner.style.display = 'none';
                    uploadResumeText.textContent = 'Upload Resume';
                }
            } else {
                alert('Please upload a valid PDF file.');
            }
        }
    });

});
