(function () {
    let lastDismissTime = 0;
    let lastExecutionTime = 0;
    let personalInfo = null;

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

                const now = Date.now();

                // Check if 5 seconds have passed since the last execution
                if (now - lastDismissTime < 5000) {
                    console.log("Too soon to dismiss modal.");
                    return; // Exit the function if it's too soon
                }

                lastDismissTime = now; // Update the last execution time

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

                if (inputBox) {
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
                                'address'
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
                            case 'full Name':
                            case 'your Name':
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
                        inputBox.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
                    } else if (
                        (inputBox.type === 'checkbox' || inputBox.type === 'radio') &&
                        !inputBox.checked &&
                        [
                            'prefer not to disclose',
                            "i don't wish to answer",
                            'prefer not to say',
                            'prefer to not disclose',
                            'prefer not to identify'
                        ].includes(labelText)
                    ) {
                        inputBox.checked = true;
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
        const now = Date.now();

        // Check if 1 second has passed since the last execution
        if (now - lastExecutionTime < 1000) {
            return; // Exit the function if it's too soon
        }

        lastExecutionTime = now; // Update the last execution time

        const element = document.querySelector('.jobs-search-results-list');
        if (!element) return;
        // Scroll to the bottom of the element
        element.scrollTop = element.scrollHeight;

        let activeLi = document.querySelector('.jobs-search-results-list__list-item--active');
        let nextLi = activeLi ? activeLi.closest('li').nextElementSibling : null;

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
            return `${jobTitle}\n${element.textContent.trim()}`;
        } else {
            console.error('Element not found');
            return '';
        }
    }

})();