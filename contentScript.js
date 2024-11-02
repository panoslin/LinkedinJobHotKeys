(function () {

    // Function to detect 'Application sent' in .artdeco-modal and click the dismiss button
    function dismissApplicationSentModal() {
        // Select the h2 element inside .artdeco-modal and check if its text is 'Application sent'
        const modalHeading = document.querySelector('.artdeco-modal h2');

        if (modalHeading && (modalHeading.textContent.trim() === 'Application sent' || modalHeading.textContent.trim() === 'Premium' || modalHeading.textContent.trim() === 'Top Choice' || modalHeading.textContent.trim().includes('Your application was sent'))) {
            // Find the dismiss button inside the same modal
            const dismissButton = document.querySelector('.artdeco-modal button[aria-label="Dismiss"]');

            // If the dismiss button exists, click it
            if (dismissButton) {
                dismissButton.click();
                console.log("Dismiss button clicked for 'Application sent' modal.");
                // Select and click the next li element
                selectAndClickNextLi();
            }
        }
    }

    // Function to automatically check the checkbox if the label says 'Prefer not to disclose'
    function checkPreferNotToDisclose() {
        // Find all label elements
        const labels = document.querySelectorAll('label');

        // Loop through all label elements to find the one with the text 'Prefer not to disclose'
        labels.forEach(label => {
            if (label.textContent.trim() === 'Prefer not to disclose' || label.textContent.trim() === 'I don\'t wish to answer' || label.textContent.trim() === 'Prefer not to say' || label.textContent.trim() === 'Prefer to not disclose' || label.textContent.trim() === 'Prefer not to identify') {
                // Get the corresponding checkbox using the label's 'for' attribute
                const checkboxId = label.getAttribute('for');
                const checkbox = document.getElementById(checkboxId);

                // If the checkbox exists and is not already checked, check it
                if (checkbox && (checkbox.type === 'checkbox' || checkbox.type === 'radio') && !checkbox.checked) {
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event('change', {bubbles: true}));
                    console.log("Checkbox for 'Prefer not to disclose' checked automatically.");
                }
            }
        });
    }

    function fillLinkedinUrl() {
        // Find all label elements
        const labels = document.querySelectorAll('label');

        // Loop through all label elements to find the one with the text 'Prefer not to disclose'
        labels.forEach(label => {
            if (label.textContent.trim().includes('LinkedIn')) {
                const inputBoxId = label.getAttribute('for');
                const inputBox = document.getElementById(inputBoxId);

                // If the checkbox exists and is not already checked, check it
                if (inputBox && inputBox.type === 'text') {
                    inputBox.value = 'https://www.linkedin.com/in/panoslin/';
                    inputBox.dispatchEvent(new Event('change', {bubbles: true}));
                }
            }
        });
    }

    // function fillSponsorship() {
    //     // Find all label elements
    //     const labels = document.querySelectorAll('label');
    //
    //     // Loop through all label elements to find the one with the text 'Prefer not to disclose'
    //     labels.forEach(label => {
    //         if (label.textContent.trim() === 'Do you have US citizenship or a Greencard') {
    //             const inputBoxId = label.getAttribute('for');
    //             const inputBox = document.getElementById(inputBoxId);
    //
    //             // If the checkbox exists and is not already checked, check it
    //             if (inputBox && inputBox.type === 'text') {
    //                 inputBox.value = 'https://www.linkedin.com/in/panoslin/';
    //                 inputBox.dispatchEvent(new Event('change', {bubbles: true}));
    //             }
    //         }
    //     });
    // }

    // Function to uncheck the follow company checkbox
    function uncheckFollowCompanyCheckbox() {
        const followCheckbox = document.getElementById('follow-company-checkbox');
        if (followCheckbox && followCheckbox.checked) {
            followCheckbox.checked = false;
            // Dispatch a change event to notify any listeners
            followCheckbox.dispatchEvent(new Event('change', {bubbles: true}));
        }
    }


    // Call the functions initially
    uncheckFollowCompanyCheckbox();
    checkPreferNotToDisclose();
    fillLinkedinUrl();
    dismissApplicationSentModal();

    // Set up a MutationObserver to watch for changes in the DOM
    const observer = new MutationObserver(function (mutationsList) {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                uncheckFollowCompanyCheckbox();
                checkPreferNotToDisclose();
                dismissApplicationSentModal();
                fillLinkedinUrl();
            }
        }
    });

    // Start observing the body for added nodes
    observer.observe(document.body, {childList: true, subtree: true});

    function downladJD(applied=false) {
        // download the jd to local
        const text = extractTextFromElement('.jobs-box__html-content .mt4');
        console.log(text)
        if (text) {
            const blob = new Blob([text], {type: 'text/plain'});
            const url = URL.createObjectURL(blob);

            const currentJobId =  new URL(window.location.href).searchParams.get("currentJobId");

            chrome.runtime.sendMessage({
                action: 'download',
                url: url,
                filename: `LinkedinJD-${applied}-${currentJobId}.txt`
            });
        }

    }

    // Function to select and click the next li element
    function selectAndClickNextLi() {
        const element = document.querySelector('.jobs-search-results-list');
        // Scroll to the bottom of the element
        element.scrollTop = element.scrollHeight;
        let activeLi = document.querySelector('.jobs-search-results-list__list-item--active');
        let nextLi = activeLi ? activeLi.closest('li').nextElementSibling : null;

        let found = false;
        while (nextLi) {
            const viewedElement = nextLi.querySelector('.job-card-container__footer-job-state');
            if (!viewedElement || (viewedElement.textContent.trim() !== 'Viewed' && viewedElement.textContent.trim() !== 'Applied')) {
                nextLi.scrollIntoView({behavior: 'smooth', block: 'center'});
                const clickableElement = nextLi.querySelector('.job-card-container--clickable');
                if (clickableElement) {
                    clickableElement.click();
                }
                found = true;
                break;
            }
            nextLi = nextLi.nextElementSibling;
        }

        if (!found) {
            const activePaginationLi = document.querySelector('.artdeco-pagination__indicator.active');
            const nextPaginationLi = activePaginationLi ? activePaginationLi.nextElementSibling : null;
            if (nextPaginationLi) {
                nextPaginationLi.querySelector('button').click();
            }
        }
    }

    // Event listener for Shift + Ctrl + X to select and click next li element
    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey && event.code === 'KeyD') {
            event.preventDefault();
            event.stopPropagation();
            downladJD(false);
        }
    });

    // Event listener for Shift + Ctrl + X to select and click next li element
    document.addEventListener('keydown', function (event) {
        if (event.shiftKey && event.ctrlKey && event.code === 'KeyX') {
            event.preventDefault();
            event.stopPropagation();
            downladJD(false);
            selectAndClickNextLi();
        }
    });

    // Event listener for Ctrl + X to trigger next step button click
    document.addEventListener('keydown', function (e) {
        if (!e.shiftKey && e.ctrlKey && e.key.toLowerCase() === 'x') {
            e.preventDefault();

            const buttonSelectors = [
                'button[aria-label="Continue to next step"]',
                'button[aria-label="Review your application"]',
                'button[aria-label="Submit application"]',
                '.jobs-s-apply button.jobs-apply-button.artdeco-button--3[data-job-id][aria-label]',
                '.jobs-apply-button--top-card .jobs-apply-button',
                'button[aria-label="Dismiss"]',
            ];

            for (let selector of buttonSelectors) {
                console.log('Trying selector:', selector);
                let button = document.querySelector(selector);
                if (button) {
                    console.log('Found button:', button);
                    if (selector=== '.jobs-s-apply button.jobs-apply-button.artdeco-button--3[data-job-id][aria-label]' || selector === '.jobs-apply-button--top-card .jobs-apply-button') {
                        downladJD(true);
                    }
                    button.click();
                    break;
                }
            }
        }
    });


    function extractTextFromElement(selector) {
        // get job title from .job-details-jobs-unified-top-card__job-title a
        const jobTitleElement = document.querySelector('.job-details-jobs-unified-top-card__job-title a');
        if (jobTitleElement) {
            const jobTitle = jobTitleElement.textContent.trim();

            const element = document.querySelector(selector);
            if (element) {
                return jobTitle + '\n' + element.textContent.trim(); // Use .trim() to remove leading/trailing whitespace
            } else {
                console.error('Element not found');
                return '';
            }
        }
    }


})();