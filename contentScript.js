(function () {
    let personalInfo = null;
    let curJid = null;
    let resumeText = null;
    let inspectMode = false;

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
                    return;
                }
                startObserver();
            });
        } catch (error) {
            console.error('Failed to load personal information:', error);
        }
    })();

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
            console.error('Error in fillForm:', error);
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
                    // Exit after handling the first relevant mutation
                    break;
                }
            }
        }, 400);

        const observer = new MutationObserver(throttledCallback);
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
            if (document.querySelector('.jobs-s-apply a.jobs-s-apply__application-link')) {
                // downloadJD(true);
            } else {
                downloadJD(false);
            }
            selectAndClickNextLi();
        } else if (ctrlKey && code === 'KeyZ') {
            event.preventDefault();
            let activeLi = document.querySelector('.jobs-search-results-list__list-item--active');
            activeLi.scrollIntoView({behavior: 'smooth', block: 'center'});
        } else if (ctrlKey && code === 'KeyC') {
            event.preventDefault();
            if (inspectMode) {
                inspector.disableInspectMode();
            } else {
                inspector.enableInspectMode();
            }
        } else if (inspectMode && code === 'Escape') {
            event.preventDefault();
            inspector.disableInspectMode();
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
                            <button class="artdeco-button artdeco-button--3 artdeco-button--premium ember-view evaluation" disabled>
                                <span class="artdeco-button__text">Evaluating ☕️</span>
                            </button>
                        </div>
                    `;
                topCard.appendChild(jobsApplyDiv);
            }
            if (compatibleButton) {
                compatibleButton.querySelector('span').textContent = 'Evaluating ☕️';
                compatibleButton.disabled = true;
                if (!resumeText) {
                    compatibleButton.querySelector('span').textContent = 'upload Resume to Evaluate';
                } else {
                    makePredictionRequest(resumeText, '', jdText).then(response => {
                        compatibleButton.disabled = response.predicted_class !== 1;
                        compatibleButton.querySelector('span').textContent = response.predicted_class === 1 ? 'Compatible 🎉' : 'Incompatible 🙁';
                    }).catch(error => {
                        compatibleButton.querySelector('span').textContent = error.message;
                    })
                }

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
    }

    // Function to toggle the inspect mode
    function enableInspectMode() {
        let style, selectedElement = null;

        function addHighlightStyle() {
            style = document.createElement('link');
            style.rel = 'stylesheet';
            style.href = chrome.runtime.getURL('styles/inspection_mode.css');
            document.head.appendChild(style);
        }

        function removeHighlightStyle() {
            if (style) style.remove();
            if (selectedElement) {
                selectedElement.classList.remove('highlight');
            }
        }

        function onMouseOver(event) {
            if (selectedElement) return;
            event.target.classList.add('highlight');
        }

        function onMouseOut(event) {
            if (selectedElement) return;
            event.target.classList.remove('highlight');
        }

        function onClick(event) {
            event.preventDefault();
            event.stopPropagation();
            if (selectedElement) {
                selectedElement.classList.remove('highlight');
            }
            selectedElement = event.target;
            selectedElement.classList.add('highlight');

            // Show loading toast
            displayToast('loading');
            makePredictionRequest(resumeText, '', selectedElement.innerText)
                .then(response => {
                    displayToast(response.predicted_class === 1);
                })
                .catch(error => {
                    displayToast(error.message || 'An unexpected error occurred.');
                    console.error('Error:', error);
                });

            disableInspectMode();

        }

        function enableInspectMode() {
            console.log('Inspect Mode Enabled');
            addHighlightStyle();
            document.addEventListener('mouseover', onMouseOver);
            document.addEventListener('mouseout', onMouseOut);
            document.addEventListener('click', onClick);
            inspectMode = true;
        }

        function disableInspectMode() {
            console.log('Inspect Mode Disabled');
            removeHighlightStyle();
            document.removeEventListener('mouseover', onMouseOver);
            document.removeEventListener('mouseout', onMouseOut);
            document.removeEventListener('click', onClick);
            inspectMode = false;
            selectedElement = null;
        }

        return {enableInspectMode, disableInspectMode};
    }

    const inspector = enableInspectMode();
    function displayToast(status) {
        let toast = document.getElementById('extension-toast');
        let style = document.getElementById('extension-toast-style');

        // Create toast container if not already present
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'extension-toast';
            toast.className = 'extension-toast';
            document.body.appendChild(toast);
        }

        // Inject the stylesheet if not already added
        if (!style) {
            style = document.createElement('link');
            style.rel = 'stylesheet';
            style.id = 'extension-toast-style';
            style.href = chrome.runtime.getURL('styles/modal.css'); // Ensure this matches your CSS file location
            document.head.appendChild(style);
        }

        // Set toast content and style based on status
        if (status === true) {
            toast.innerHTML = `
            <div class="toast-content">MATCH 🎉</div>
        `;
            toast.className = 'extension-toast success';
            hideToastAfterDelay(toast, style);
        } else if (status === false) {
            toast.innerHTML = `
            <div class="toast-content">MISMATCH 🙁</div>
        `;
            toast.className = 'extension-toast error';
            hideToastAfterDelay(toast, style);
        } else if (status === 'loading') {
            toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-spinner"></div>
                <div>Loading...</div>
            </div>
        `;
            toast.className = 'extension-toast loading';
        } else if (typeof status === 'string') {
            toast.innerHTML = `
            <div class="toast-content">${status}</div>
        `;
            toast.className = 'extension-toast message';
            hideToastAfterDelay(toast, style);
        } else {
            console.error('Invalid status for toast');
        }

        // Show the toast with animation
        toast.classList.remove('hide');
        toast.classList.add('show');

        // Allow manual dismissal on click
        toast.addEventListener('click', () => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => {
                toast.remove();
                style.remove();
            }, 400);
        });
    }

    function hideToastAfterDelay(toast, style, delay = 3000) {
        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => {
                toast.remove();
                style.remove();
            }, 400); // Match this to the fadeOut animation duration
        }, delay);
    }

})();