(function () {
    let personalInfo = null;
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
        } catch (error) {
            console.error('Failed to load personal information:', error);
        }
    })();

    function dismissApplicationSentModal() {

        // Select the h2 element inside .artdeco-modal and check if its text matches certain conditions
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
            // Find all label elements
            const labels = document.querySelectorAll('label');

            labels.forEach(label => {
                const labelText = label.textContent
                    .trim()
                    .replace('*', '')
                    .toLowerCase();
                const inputBoxId = label.getAttribute('for');
                const inputBox = document.getElementById(inputBoxId);

                if (inputBox && !inputBox.dataset.autofilled) {
                    if (
                        (
                            inputBox.type === 'text' ||
                            inputBox.type === 'email' ||
                            inputBox.type === 'number' ||
                            inputBox.type === 'tel' ||
                            inputBox.type === 'url' ||
                            inputBox.type === 'password'
                        ) && inputBox.value === ''
                    ) {
                        switch (labelText) {
                            case labelText.includes('linkedin') && personalInfo.linkedin && labelText:
                                inputBox.value = personalInfo.linkedin;
                                console.log("LinkedIn URL filled automatically.");
                                break;
                            case [
                                'location',
                                'city',
                                'home address'
                            ].some(term => labelText.includes(term)) && !label.classList.contains('jobs-search-box__input-icon') && labelText:
                                inputBox.value = personalInfo.location;
                                console.log("Location filled automatically.");
                                break;
                            case 'current company':
                                inputBox.value = personalInfo.company;
                                console.log("Current company filled automatically.");
                                break;
                            case labelText.includes('github') && personalInfo.github && labelText:
                                inputBox.value = personalInfo.github;
                                console.log("GitHub URL filled automatically.");
                                break;
                            case labelText.includes('first name') && personalInfo.name && labelText:
                                inputBox.value = personalInfo.name.split(' ')[0];
                                console.log("First name filled automatically.");
                                break;
                            case labelText.includes('last name') && personalInfo.name && labelText:
                                inputBox.value = personalInfo.name.split(' ')[1];
                                console.log("Last name filled automatically.");
                                break;
                            case labelText.includes('preferred name') && personalInfo.preferred_name && labelText:
                                inputBox.value = personalInfo.preferred_name;
                                console.log("Preferred name filled automatically.");
                                break;
                            case labelText.includes('name') && personalInfo.name && labelText:
                                inputBox.value = personalInfo.name;
                                console.log("Name filled automatically.");
                                break;
                            case 'how did you hear about this job?':
                                inputBox.value = 'LinkedIn';
                                console.log("Source filled automatically.");
                                break;
                            case labelText.includes('email') && personalInfo.email && labelText:
                                inputBox.value = personalInfo.email;
                                console.log("Email filled automatically.");
                                break;
                            case [
                                'phone',
                                'mobile',
                                'phone number',
                                'mobile number'
                            ].some(term => labelText.includes(term)) && personalInfo.phone && labelText:
                                inputBox.value = personalInfo.phone;
                                console.log("Phone number filled automatically.");
                                break;
                        }
                        inputBox.dataset.autofilled = 'true';
                        inputBox.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
                    } else if (
                        (
                            inputBox.type === 'checkbox' ||
                            inputBox.type === 'radio'
                        ) &&
                        !inputBox.checked &&
                        (
                            (labelText.includes('prefer') && labelText.includes('not')) ||
                            (labelText.includes("don't") && labelText.includes('answer')) ||
                            (labelText.includes("do not") && labelText.includes('answer')) ||
                            labelText === 'decline to self identify'
                        )
                    ) {
                        inputBox.checked = true;
                        inputBox.dispatchEvent(new Event('change', {bubbles: true}));
                        console.log("Checkbox for 'Prefer not to disclose' checked automatically.");
                        inputBox.dataset.autofilled = 'true';
                    } else if (
                        inputBox.type === 'select-one'
                    ) {
                        switch (labelText) {
                            case [
                                "legally",
                                "authorized",
                                "work",
                            ].every(keyword => labelText.includes(keyword)) && labelText:
                                inputBox.value = 'Yes';
                                console.log("Select 'Yes' for 'Legally authorized to work in the United States' automatically.");
                                break;
                            case [
                                "lawfully",
                                "authorized",
                                "work",
                            ].every(keyword => labelText.includes(keyword)) && labelText:
                                inputBox.value = 'Yes';
                                console.log("Select 'Yes' for 'Legally authorized to work in the United States' automatically.");
                                break;
                            case [
                                "now",
                                "future",
                                "sponsor",
                            ].every(keyword => labelText.includes(keyword)) && labelText:
                                inputBox.value = 'Yes';
                                console.log("Select 'Yes' for 'Will you in the future, require sponsorship' automatically.");
                                break;
                            case [
                                "non-compete",
                                "restrictions",
                            ].every(keyword => labelText.includes(keyword)) && labelText:
                                inputBox.value = 'No';
                                console.log("Select 'No' for 'Are you subject to any non-compete restrictions?' automatically.");
                                break;
                            case [
                                "currently",
                                "employed",
                                "by",
                            ].every(keyword => labelText.includes(keyword)) && labelText:
                                inputBox.value = 'No';
                                console.log("Select 'No' for 'Currently employed by another company' automatically.");
                                break;
                            case [
                                "ever",
                                "been",
                                "employed",
                                "by",
                            ].every(keyword => labelText.includes(keyword)) && labelText:
                                inputBox.value = 'No';
                                console.log("Select 'No' for 'Have you ever been employed by another company' automatically.");
                                break;

                        }
                        inputBox.dataset.autofilled = 'true';
                        inputBox.dispatchEvent(new Event('change', {bubbles: true}));
                        console.log("Checkbox for 'Prefer not to disclose' checked automatically.");
                    }
                }
            });
        } catch (error) {
            console.error('Error in fillForm:', error);
        }
    }

    function uncheckFollowCompanyCheckbox() {
        const followCheckbox = document.getElementById('follow-company-checkbox');
        if (followCheckbox && followCheckbox.checked) {
            followCheckbox.checked = false;
            // Dispatch a change event to notify any listeners
            followCheckbox.dispatchEvent(new Event('change', {bubbles: true}));
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
                    predictCompatibility();
                    break; // Exit after handling the first relevant mutation
                }
            }
        }, 200); // Adjust the delay as needed

        // Set up a MutationObserver to watch for changes in the DOM
        const observer = new MutationObserver(throttledCallback);

        // Start observing the body for added nodes
        observer.observe(document.body, {childList: true, subtree: true});
    }

    function downloadJD(applied = false) {
        // Download the job description to local
        const text = extractTextFromElement('.jobs-box__html-content .mt4');
        if (text) {
            const blob = new Blob([text], {type: 'text/plain'});
            const url = URL.createObjectURL(blob);

            const currentJobId = new URL(window.location.href).searchParams.get("currentJobId");

            chrome.runtime.sendMessage({
                action: 'download',
                url: url,
                filename: `LinkedinJD-${applied}-${currentJobId}.txt`
            });
        }
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
            if (!element) return;
            // Scroll to the bottom of the element
            element.scrollTop = element.scrollHeight;
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
        if (nextPaginationLi) {
            nextPaginationLi.querySelector('button').click();
        }
    }

    // Combined event listener for keydown events
    document.addEventListener('keydown', function (event) {
        const {ctrlKey, shiftKey, code} = event;
        if (ctrlKey && code === 'KeyD') {
            event.preventDefault();
            downloadJD(false);
        } else if (ctrlKey && shiftKey && code === 'KeyX') {
            event.preventDefault();
            downloadJD(false);
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
                        downloadJD(true);
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
            console.error('Element not found');
            return '';
        }
    }

    function predictCompatibility() {
        const jobDescriptionEle = document.querySelector('.jobs-box__html-content .mt4');
        const jobId = new URL(window.location.href).searchParams.get("currentJobId");
        if (jobDescriptionEle && jobId !== curJid) {
            const jdText = extractTextFromElement('.jobs-box__html-content .mt4');
            const topCard = document.querySelector('.job-details-jobs-unified-top-card__container--two-pane .mt4 div.display-flex');
            const compatibleButton = document.querySelector('.job-details-jobs-unified-top-card__container--two-pane .mt4 div.display-flex .evaluation');
            if (!compatibleButton && topCard) {
                const jobsApplyDiv = document.createElement('div');
                jobsApplyDiv.classList.add('jobs-s-apply', 'inline-flex', 'ml2');
                jobsApplyDiv.innerHTML = `
                        <div class="jobs-apply-button--top-card">
                            <button class="jobs-apply-button artdeco-button artdeco-button--3 artdeco-button--premium ember-view evaluation" disabled>
                                <span class="artdeco-button__text">Evaluating ☕️</span>
                            </button>
                        </div>
                    `;
                topCard.appendChild(jobsApplyDiv);
            }
            if (compatibleButton) {
                compatibleButton.querySelector('span').textContent = 'Evaluating ☕️';
                compatibleButton.disabled = true;
                makePredictionRequest('', 'dataset/resume.pdf', jdText).then(response => {
                    compatibleButton.disabled = response.predicted_class !== 1;
                    compatibleButton.querySelector('span').textContent = response.predicted_class === 1 ? 'Compatible 🎉' : 'Incompatible 🙁';
                }).catch(error => {
                    console.error('Error:', error);
                    compatibleButton.querySelector('span').textContent = error.detail[0].msg;
                })
                curJid = jobId;
            }
        }


    }

    async function makePredictionRequest(resumeText, resumePdfPath, jobDescriptionText) {
        const url = CONFIG.API_URL;

        const data = {
            "resume_text": resumeText,
            "resume_pdf_path": resumePdfPath,
            "job_description_text": jobDescriptionText
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error:', error);
            return {error: error.message}; // Optionally return the error message in case of failure
        }
    }

})();