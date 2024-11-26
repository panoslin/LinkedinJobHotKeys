document.addEventListener('DOMContentLoaded', () => {
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

    document.getElementById('uploadResume').addEventListener('click', () => {
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
                            const redactedResumeText = redactSensitiveInfo(resumeText, personalInfo);
                            chrome.storage.local.set({resumeText: redactedResumeText}, function () {
                                alert(redactedResumeText);
                            });
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
