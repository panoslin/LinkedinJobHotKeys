document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('personalInfoForm');
    const status = document.getElementById('status');
    const resumeInput = document.getElementById('resume');
    let chatGPTAccessToken = '';
    let personalInfo;

    document.getElementById('homeIcon').addEventListener('click', () => {
        window.location.href = chrome.runtime.getURL('landing/landing.html?fromHome=true');
    });

    // Load saved data and populate the form
    chrome.storage.local.get(['personalInfo', 'chatGPTAccessToken'], (result) => {
        if (result.personalInfo) {
            personalInfo = result.personalInfo;
            Object.entries(result.personalInfo).forEach(([key, value]) => {
                if (key !== 'resume') {
                    const input = document.getElementById(key);
                    if (input) input.value = value;
                }
            });
        }
        chatGPTAccessToken = result.chatGPTAccessToken;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const uploadResumeSpinner = document.getElementById('uploadResumeSpinner');
        const uploadResumeText = document.getElementById('uploadResumeText');
        uploadResumeSpinner.style.display = 'inline-block';
        uploadResumeText.textContent = 'Uploading...';

        try {
            let formData = new FormData(form);

            // Populate personalInfo from the form
            formData.forEach((value, key) => {
                if (key === 'resume') {
                    // Skip processing for the resume field here
                } else {
                    personalInfo[key] = value;
                }
            });

            if (resumeInput.files.length > 0) {
                const file = resumeInput.files[0];

                if (file.type !== 'application/pdf') {
                    alert('Please upload a PDF file.');
                    throw new Error('Invalid file type');
                }

                const fileReader = new FileReader();

                // Read the file as an ArrayBuffer
                const typedarray = await new Promise((resolve, reject) => {
                    fileReader.onload = function () {
                        resolve(new Uint8Array(this.result));
                    };
                    fileReader.onerror = function () {
                        reject(new Error('Error reading the file.'));
                    };
                    fileReader.readAsArrayBuffer(file);
                });

                // Extract text from the PDF
                uploadResumeText.textContent = 'Extracting Information ...';
                const resumeText = await extractTextFromPDF(typedarray);
                chrome.runtime.sendMessage({
                    action: 'forwardToContentScript',
                    message: {action: 'summarizeResume', chatGPTAccessToken: chatGPTAccessToken, resumeText: resumeText}
                });

                // Redact sensitive information
                const redactedResumeText = redactSensitiveInfo(resumeText, personalInfo);

                // Save data to local storage
                await new Promise((resolve) => {
                    chrome.storage.local.set(
                        {
                            resumeText: redactedResumeText,
                            personalInfo: personalInfo
                        },
                        resolve
                    );
                });
            } else {
                // save personal info to local storage
                await new Promise((resolve) => {
                    chrome.storage.local.set(
                        {
                            personalInfo: personalInfo
                        },
                        resolve
                    );
                });
            }

            status.textContent = 'Personal information saved!';
            setTimeout(() => {
                status.textContent = '';
            }, 3000);

            // Notify the extension of the update
            await chrome.runtime.sendMessage({
                action: 'forwardToContentScript',
                message: {action: 'updatePersonalInfo'}
            });

        } catch (error) {
            console.error('An error occurred:', error.message);
        } finally {
            // Hide the spinner
            uploadResumeSpinner.style.display = 'none';
            uploadResumeText.textContent = 'Extraction Completed';
        }
    });
});
