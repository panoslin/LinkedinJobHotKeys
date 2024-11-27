(function () {
    let personalInfo = null;
    let resumeText = null;
    let chatGPTAccessToken = null;
    let curJid = null;

    // Fetch personal information once and start the observer after it's loaded
    (async function fetchPersonalInfo() {
        try {
            chrome.storage.local.get('personalInfo', (result) => {
                personalInfo = result.personalInfo;
                if (!personalInfo) {
                    console.warn('Personal info not found. Please set it in the extension popup.');
                    return;
                }
                startObserver();
            });
            chrome.storage.local.get('resumeText', (result) => {
                resumeText = result.resumeText;
                if (!resumeText) {
                    console.warn('resumeText not found. Please set it in the extension popup.');
                }
            });
            chrome.storage.local.get('chatGPTAccessToken', (result) => {
                chatGPTAccessToken = result.chatGPTAccessToken;
                if (!chatGPTAccessToken) {
                    console.warn('chatGPTAccessToken not found. Please set it in the extension popup.');
                }
            });
        } catch (error) {
            console.error('Failed to load personal information:', error);
        }
    })();

    (async function insertKeywordStyle() {
        // insert styles/keywords.css to head
        const styleElement = document.createElement('link');
        styleElement.rel = 'stylesheet';
        styleElement.href = chrome.runtime.getURL('styles/keywords.css');
        document.head.appendChild(styleElement);
    })();

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log(request);
        if (request.action === 'updatePersonalInfo') {
            chrome.storage.local.get('personalInfo', (result) => {
                personalInfo = result.personalInfo;
                if (!personalInfo) {
                    console.warn('Personal info not found. Please set it in the extension popup.');
                    return;
                }
                startObserver();
            });
            chrome.storage.local.get('resumeText', (result) => {
                resumeText = result.resumeText;
                if (!resumeText) {
                    console.warn('resumeText not found. Please set it in the extension popup.');
                }
            });
        }
    });

    function dismissApplicationSentModal() {

        const modalHeading = document.querySelector('.artdeco-modal h2');
        const modalText = modalHeading?.textContent.trim();

        if (modalText && (
            ['Application sent', 'Premium', 'Top Choice', 'Added to your applied jobs'].includes(modalText) ||
            modalText.includes('Your application was sent')
        )) {
            // Find the dismiss button inside the same modal
            const dismissButton = document.querySelector('.artdeco-modal button[aria-label="Dismiss"]');

            // If the dismiss button exists, click it
            if (dismissButton) {
                dismissButton.click();
                console.log("Dismiss button clicked for modal.");
                // Select and click the next li element
                selectAndClickNextLi();
            }
        }
    }

    function fillForm() {
        if (!personalInfo) {
            console.warn('Personal info not loaded yet.');
            return;
        }

        try {
            const labels = document.querySelectorAll('label');

            labels.forEach(label => {
                const labelText = label.textContent.trim().replace('*', '').toLowerCase();
                const inputBoxId = label.getAttribute('for');
                const inputBox = document.getElementById(inputBoxId);

                if (inputBox && !inputBox.dataset.autofilled) {
                    const inputType = inputBox.type.toLowerCase();

                    if (['text', 'email', 'number', 'tel', 'url', 'password'].includes(inputType)) {
                        processTextInput(inputBox, labelText);
                    } else if (['checkbox', 'radio'].includes(inputType)) {
                        processCheckboxInput(inputBox, labelText);
                    } else if (inputBox.tagName.toLowerCase() === 'select') {
                        processSelectInput(inputBox, labelText);
                    }
                }
            });
        } catch (error) {
            console.log('Error in fillForm:', error);
        }
    }

    function processTextInput(inputBox, labelText) {
        if (inputBox.value !== '') return;

        if (labelText.includes('linkedin') && personalInfo.linkedin) {
            inputBox.value = personalInfo.linkedin;
            console.log("LinkedIn URL filled automatically.");
        } else if (
            ['location', 'city', 'home address'].some(term => labelText.includes(term)) &&
            !inputBox.classList.contains('jobs-search-box__text-input')
        ) {
            inputBox.value = personalInfo.location;
            console.log("Location filled automatically.");
        } else if (labelText.includes('current company') && personalInfo.company) {
            inputBox.value = personalInfo.company;
            console.log("Current company filled automatically.");
        } else if (labelText.includes('github') && personalInfo.github) {
            inputBox.value = personalInfo.github;
            console.log("GitHub URL filled automatically.");
        } else if (labelText.includes('first name') && personalInfo.name) {
            inputBox.value = personalInfo.name.split(' ')[0];
            console.log("First name filled automatically.");
        } else if (labelText.includes('last name') && personalInfo.name) {
            inputBox.value = personalInfo.name.split(' ')[1];
            console.log("Last name filled automatically.");
        } else if (labelText.includes('preferred name') && personalInfo.preferred_name) {
            inputBox.value = personalInfo.preferred_name;
            console.log("Preferred name filled automatically.");
        } else if (labelText === 'name' && personalInfo.name) {
            inputBox.value = personalInfo.name;
            console.log("Name filled automatically.");
        } else if (labelText.includes('how did you hear about this job?')) {
            inputBox.value = 'LinkedIn';
            console.log("Source filled automatically.");
        } else if (labelText.includes('email') && personalInfo.email) {
            inputBox.value = personalInfo.email;
            console.log("Email filled automatically.");
        } else if (
            ['phone', 'mobile', 'phone number', 'mobile number'].some(term => labelText.includes(term)) &&
            personalInfo.phone
        ) {
            inputBox.value = personalInfo.phone;
            console.log("Phone number filled automatically.");
        } else {
            return;
        }

        inputBox.dataset.autofilled = 'true';
        inputBox.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
    }

    function processCheckboxInput(inputBox, labelText) {
        if (inputBox.checked) return;

        if (
            (labelText.includes('prefer') && labelText.includes('not')) ||
            (labelText.includes("don't") && labelText.includes('answer')) ||
            (labelText.includes("do not") && labelText.includes('answer')) ||
            labelText === 'decline to self identify'
        ) {
            inputBox.checked = true;
            inputBox.dispatchEvent(new Event('change', {bubbles: true}));
            console.log("Checkbox for 'Prefer not to disclose' checked automatically.");
            inputBox.dataset.autofilled = 'true';
        }
    }

    function processSelectInput(inputBox, labelText) {
        if (inputBox.value !== '') return;

        if (
            ["legally", "authorized", "work"].every(keyword => labelText.includes(keyword)) ||
            ["lawfully", "authorized", "work"].every(keyword => labelText.includes(keyword))
        ) {
            inputBox.value = 'Yes';
            console.log("Selected 'Yes' for authorization to work.");
        } else if (["now", "future", "sponsor"].every(keyword => labelText.includes(keyword))) {
            inputBox.value = 'Yes';
            console.log("Selected 'Yes' for future sponsorship requirement.");
        } else if (["non-compete", "restrictions"].every(keyword => labelText.includes(keyword))) {
            inputBox.value = 'No';
            console.log("Selected 'No' for non-compete restrictions.");
        } else if (["currently", "employed", "by"].every(keyword => labelText.includes(keyword))) {
            inputBox.value = 'No';
            console.log("Selected 'No' for current employment status.");
        } else if (["ever", "been", "employed", "by"].every(keyword => labelText.includes(keyword))) {
            inputBox.value = 'No';
            console.log("Selected 'No' for previous employment history.");
        } else {
            return;
        }

        inputBox.dataset.autofilled = 'true';
        inputBox.dispatchEvent(new Event('change', {bubbles: true}));
    }

    function uncheckFollowCompanyCheckbox() {
        const followCheckbox = document.getElementById('follow-company-checkbox');
        if (followCheckbox && followCheckbox.checked) {
            followCheckbox.checked = false;
            // Dispatch a change event to notify any listeners
            followCheckbox.dispatchEvent(new Event('change', {bubbles: true}));
        }
    }

    function analyzeKeyword(mutation) {
        const jobId = new URL(window.location.href).searchParams.get("currentJobId");
        // 1. get keywords
        const jd = extractTextFromElement('.jobs-search__job-details--wrapper');
        if (jd && resumeText && chatGPTAccessToken && jobId !== curJid) {
            curJid = jobId;
            const chatGPTContainers = document.querySelectorAll('.chat-gpt-suggested-keywords-container');
            if (chatGPTContainers) {
                chatGPTContainers.forEach((chatGPTContainer) => {
                    chatGPTContainer.remove();
                })
            }
            const jd = extractTextFromElement('.jobs-search__job-details--wrapper');
            const resume = personalInfo.summarizedResume || resumeText;
            const userPrompt = `
                \nAdditional information: ${personalInfo.additional_info}
                \n\nResume: ${resume}
                \n\nJD: ${jd}
            `
            const container = document.querySelector('.job-details-jobs-unified-top-card__container--two-pane div');
            if (container) {
                const chatGPTContainer = document.createElement('div');
                chatGPTContainer.classList.add('chat-gpt-suggested-keywords-container');

                // Add a loading spinner or message
                const loadingStatus = document.createElement('div');
                loadingStatus.classList.add('loading-status');
                loadingStatus.textContent = 'Job Turbo Loading keywords...';
                chatGPTContainer.appendChild(loadingStatus);
                container.appendChild(chatGPTContainer)

                extractKeywords(chatGPTAccessToken, userPrompt).then((response) => {
                    console.log(response)
                    // Remove the loading status
                    loadingStatus.remove();

                    document.querySelector('.upsell-premium-custom-section-card__container')?.remove();
                    document.querySelector('#how-you-match-card-container')?.remove();

                    // 2. insert to '.job-details-jobs-unified-top-card__container--two-pane div'
                    const match = response.match
                    const mismatch = response.mismatch
                    const summary = response.summary
                    // const apply = response.apply

                    const keywordsContainer = document.createElement('div');
                    keywordsContainer.classList.add('keywords');
                    match.forEach((keyword) => {
                        const keywordSpan = createKeyword(keyword, true);
                        if (keywordSpan) {
                            keywordsContainer.appendChild(keywordSpan);
                        }
                    });
                    mismatch.forEach((keyword) => {
                        const keywordSpan = createKeyword(keyword, false);
                        if (keywordSpan) {
                            keywordsContainer.appendChild(keywordSpan);
                        }
                    });

                    const summaryContainer = document.createElement('div');
                    summaryContainer.classList.add('summary');
                    summaryContainer.innerHTML = `<strong>Summary:</strong> ${summary}`;

                    // const applyContainer = document.createElement('div');
                    // applyContainer.classList.add('apply');
                    // applyContainer.innerHTML = `<a href="#" class="apply-link"><span class="apply-text">✔ Apply Decision:</span> <strong>${apply ? 'Yes' : 'No'}</strong></a>`;

                    chatGPTContainer.appendChild(summaryContainer)
                    chatGPTContainer.appendChild(keywordsContainer)
                    // chatGPTcontainer.appendChild(applyContainer)


                })
            }

        }
    }

    function startObserver() {
        // Custom throttle function
        function throttle(func, delay) {
            let lastCall = 0;
            return function (...args) {
                const now = Date.now();
                if (now - lastCall >= delay) {
                    lastCall = now;
                    return func(...args);
                }
            };
        }

        // Apply throttle to your MutationObserver callback
        const throttledCallback = throttle(function (mutationsList) {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    uncheckFollowCompanyCheckbox();
                    dismissApplicationSentModal();
                    fillForm();
                    analyzeKeyword(mutation);
                    // Exit after handling the first relevant mutation
                    break;
                }
            }
        }, 400);

        const observer = new MutationObserver(throttledCallback);
        observer.observe(document.body, {childList: true, subtree: true});
    }

    function downloadJD(applied = false, jd) {
        // Download the job description to local
        const blob = new Blob([jd], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);

        const currentJobId = new URL(window.location.href).searchParams.get("currentJobId");

        chrome.runtime.sendMessage({
            action: 'download', url: url, filename: `LinkedinJD-${applied}-${currentJobId}.txt`
        });
    }

    function selectAndClickNextLi() {

        let activeLi = document.querySelector('.jobs-search-results-list__list-item--active');
        if (!activeLi) {
            document.querySelector('.job-card-list').click();
            return;
        }
        let nextLi = activeLi ? activeLi.closest('li').nextElementSibling : null;
        let count = 0;
        while (nextLi) {
            const viewedElement = nextLi.querySelector('.job-card-container__footer-job-state');
            const text = viewedElement?.textContent.trim();
            if (!viewedElement || !['Viewed', 'Applied'].includes(text)) {
                count += 1;
            }
            nextLi = nextLi.nextElementSibling;
        }
        if (count <= 2) {
            const element = document.querySelector('.jobs-search-results-list');
            if (element) {
                // Scroll to the bottom of the element
                element.scrollTop = element.scrollHeight;
            }
        }

        nextLi = activeLi ? activeLi.closest('li').nextElementSibling : null;
        while (nextLi) {
            const viewedElement = nextLi.querySelector('.job-card-container__footer-job-state');
            const text = viewedElement?.textContent.trim();

            if (!viewedElement || !['Viewed', 'Applied'].includes(text)) {
                nextLi.scrollIntoView({behavior: 'smooth', block: 'center'});
                const clickableElement = nextLi.querySelector('.job-card-container--clickable');
                if (clickableElement) {
                    clickableElement.click();
                    return;
                }
            }
            nextLi = nextLi.nextElementSibling;
        }

        // Move to the next pagination page if no unviewed job is found
        const activePaginationLi = document.querySelector('.artdeco-pagination__indicator.active');
        const nextPaginationLi = activePaginationLi?.nextElementSibling;
        nextPaginationLi?.querySelector('button')?.click();
    }

    // Combined event listener for keydown events
    document.addEventListener('keydown', function (event) {
        const {ctrlKey, shiftKey, code} = event;
        if (ctrlKey && code === 'KeyD') {
            event.preventDefault();
            makeRecord(false);
        } else if (ctrlKey && shiftKey && code === 'KeyX') {
            event.preventDefault();
            if (document.querySelector('.jobs-s-apply a.jobs-s-apply__application-link')) {
                // makeRecord(true);
            } else {
                makeRecord(false);
            }
            selectAndClickNextLi();
        } else if (ctrlKey && code === 'KeyZ') {
            event.preventDefault();
            let activeLi = document.querySelector('.jobs-search-results-list__list-item--active');
            activeLi.scrollIntoView({behavior: 'smooth', block: 'center'});
        } else if (ctrlKey && !shiftKey && code === 'KeyX') {
            event.preventDefault();

            const buttonSelectors = [
                'button[aria-label="Continue to next step"]',
                'button[aria-label="Review your application"]',
                'button[aria-label="Submit application"]',
                '.jobs-s-apply button.jobs-apply-button.artdeco-button--3[data-job-id][aria-label]',
                '.jobs-apply-button--top-card .jobs-apply-button',
                'button[aria-label="Dismiss"]',
            ];

            for (const selector of buttonSelectors) {
                const button = document.querySelector(selector);
                if (button) {
                    if (selector.includes('.jobs-apply-button')) {
                        makeRecord(true);
                    }
                    button.click();
                    break;
                }
            }
        }
    });

    function extractTextFromElement(selector) {
        // Get job title from .job-details-jobs-unified-top-card__job-title a
        const jobTitleElement = document.querySelector('.job-details-jobs-unified-top-card__job-title a');
        const jobTitle = jobTitleElement?.textContent.trim();

        const element = document.querySelector(selector);
        if (jobTitle && element) {
            return `${jobTitle}\n${element.innerText.trim()}`;
        } else {
            // console.error('Element not found');
            return '';
        }
    }

    async function makeRecord(applied) {
        const jd = extractTextFromElement('.jobs-box__html-content .mt4');
        if (jd) {
            downloadJD(applied, jd);
            const payload = {
                resume_text: resumeText,
                job_description: jd,
                applied: applied,
                link: document.location.href,
                source: document.location.hostname,
                user: null,
                job_id: window.location.href.match(/(\d+)/)[1] || null,
            };
            
            try {
                // Wait for createApplication to finish
                const data = await createApplication(payload);
                console.log("Response from server:", data);
            } catch (error) {
                console.error("Upload failed:", error.message);
            }
        }
    }

    async function createApplication(payload) {
        const url = CONFIG.API_ENDPOINT;
        const response = await fetch(`${url}/applications`, {
            method: "POST", headers: {
                "Content-Type": "application/json"
            }, body: JSON.stringify(payload)
        });

        if (!response.ok) {
            // Handle HTTP errors
            const errorData = await response.json();
            throw new Error(`Error ${response.status}: ${errorData.detail || "Unknown error"}`);
        }

        // Parse and return JSON response
        const data = await response.json();
        console.log("File uploaded successfully:", data);
        return data;
    }

    function createKeyword(keyword, isMatch) {
        const keywordSpan = document.createElement('span');
        keywordSpan.classList.add('keyword', isMatch ? 'match' : 'mismatch');
        if (keyword[0].length > 60) {
            // too long, not valid keyword
            return null;
        }
        keywordSpan.textContent = keyword[0];

        // Create a tooltip
        if (keyword[1] && keyword[1].length <= 200) {
            const tooltip = document.createElement('div');
            tooltip.classList.add('tooltip');
            tooltip.textContent = keyword[1];

            keywordSpan.appendChild(tooltip);
            // Show and hide tooltip on hover
            keywordSpan.addEventListener('mouseover', () => {
                tooltip.style.visibility = 'visible';
                tooltip.style.opacity = '1';
            });
            keywordSpan.addEventListener('mouseout', () => {
                tooltip.style.visibility = 'hidden';
                tooltip.style.opacity = '0';
            });

        }

        keywordSpan.addEventListener('click', () => {
            highlightKeywordInDiv(keyword[1]);
        });
        return keywordSpan;
    }

})();