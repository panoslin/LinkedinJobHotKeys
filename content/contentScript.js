(() => {
    if (window.__contentScriptInjected) {
        console.log("contentScript.js already injected.");
        return;
    }
    window.__contentScriptInjected = true;

    let personalInfo = null;
    let resumeText = null;
    let chatGPTAccessToken = null;
    let curKeywordJid = null;
    let curPredictionJid = null;
    let filledForms = new Set();
    let inspectMode = false;

    const ctrlZButtonSelectors = [
        'button[aria-label="Continue to next step"]',
        'button[aria-label="Review your application"]',
        'button[aria-label="Submit application"]',
        ".jobs-s-apply button.jobs-apply-button.artdeco-button--3[data-job-id][aria-label]",
        ".jobs-apply-button--top-card .jobs-apply-button",
        // 'button[aria-label="Dismiss"]',
    ];

    // Fetch personal information once and start the observer after it's loaded
    (async function fetchPersonalInfo() {
        try {
            const result = await chrome.storage.local.get([
                "personalInfo",
                "resumeText",
                "chatGPTAccessToken",
            ]);
            personalInfo = result.personalInfo;
            resumeText = result.resumeText;
            chatGPTAccessToken = result.chatGPTAccessToken;

            if (!personalInfo) {
                console.warn(
                    "Personal info not found. Please set it in the extension popup.",
                );
                return;
            }
            if (!resumeText) {
                console.warn(
                    "Resume text not found. Please set it in the extension popup.",
                );
            }
            if (!chatGPTAccessToken) {
                console.warn(
                    "ChatGPT Access Token not found. Please set it in the extension popup.",
                );
            }

            startObserver();
        } catch (error) {
            console.error("Failed to load personal information:", error);
        }
    })();

    // Insert styles/keywords.css into head
    (function insertKeywordStyle() {
        let styleElement = document.createElement("link");
        styleElement.rel = "stylesheet";
        styleElement.href = chrome.runtime.getURL("popup/keywords.css");
        document.head.appendChild(styleElement);

        styleElement = document.createElement("link");
        styleElement.rel = "stylesheet";
        styleElement.href = chrome.runtime.getURL(
            "content/inspection_mode.css",
        );
        document.head.appendChild(styleElement);

        styleElement = document.createElement("link");
        styleElement.rel = "stylesheet";
        styleElement.href = chrome.runtime.getURL("content/toast.css");
        document.head.appendChild(styleElement);
    })();

    chrome.runtime.onMessage.addListener(
        async (request, sender, sendResponse) => {
            console.log(request);
            if (request.action === "updatePersonalInfo") {
                try {
                    const result = await chrome.storage.local.get([
                        "personalInfo",
                        "resumeText",
                    ]);
                    personalInfo = result.personalInfo;
                    resumeText = result.resumeText;

                    if (!personalInfo) {
                        console.warn(
                            "Personal info not found. Please set it in the extension popup.",
                        );
                        return;
                    }
                    if (!resumeText) {
                        console.warn(
                            "Resume text not found. Please set it in the extension popup.",
                        );
                    }
                    startObserver();
                } catch (error) {
                    console.error(
                        "Failed to update personal information:",
                        error,
                    );
                }
            } else if (request.action === "summarizeResume") {
                const {chatGPTAccessToken, resumeText} = request;
                try {
                    const summarizedResume = await summarizeResume(
                        chatGPTAccessToken,
                        resumeText,
                    );
                    const response = await chrome.storage.local.get(
                        "personalInfo",
                    );
                    const personalInfo = response.personalInfo || {};
                    personalInfo.summarizedResume =
                        JSON.stringify(summarizedResume);
                    await chrome.storage.local.set({personalInfo});
                } catch (error) {
                    console.error("Failed to summarize resume:", error);
                }
            } else if (request.action === "fill-form") {
                console.log("fillForm action triggered!");
                const container = document.querySelector("form");
                fillForm(
                    personalInfo,
                    filledForms,
                    chatGPTAccessToken,
                    true,
                    container,
                    resumeText,
                );
            } else if (request.action === "fill-form-select") {
                console.log("fillForm action with select triggered!");
                inspector.setDynamicFunction((selectedElement) => {
                    fillForm(
                        personalInfo,
                        filledForms,
                        chatGPTAccessToken,
                        true,
                        selectedElement,
                        resumeText,
                    );
                });
                inspector.enableInspectMode();
            }
        },
    );

    function dismissApplicationSentModal() {
        const modalHeading = document.querySelector(".artdeco-modal h2");
        const modalText = modalHeading?.textContent.trim();

        if (
            modalText &&
            ([
                "Application sent",
                "Premium",
                "Top Choice",
                "Added to your applied jobs",
            ].includes(modalText) ||
                modalText.includes("Your application was sent"))
        ) {
            const dismissButton = document.querySelector(
                '.artdeco-modal button[aria-label="Dismiss"]',
            );
            if (dismissButton) {
                dismissButton.click();
                console.log("Dismiss button clicked for modal.");
                selectAndClickNextLi();
                return true;
            }
        }
        return false;
    }

    function uncheckFollowCompanyCheckbox() {
        const followCheckbox = document.getElementById(
            "follow-company-checkbox",
        );
        if (followCheckbox && followCheckbox.checked) {
            followCheckbox.checked = false;
            followCheckbox.dispatchEvent(new Event("change", {bubbles: true}));
        }
    }

    async function analyzeKeyword(mutation) {
        const jobId = new URL(window.location.href).searchParams.get(
            "currentJobId",
        );
        const jd = extractTextFromElement(".jobs-search__job-details--wrapper");
        const applied = document.querySelector(
            ".jobs-s-apply a.jobs-s-apply__application-link",
        );

        if (applied) {
            document
                .querySelectorAll(".chat-gpt-suggested-keywords-container")
                .forEach((el) => el.remove());
            document
                .querySelector(".upsell-premium-custom-section-card__container")
                ?.remove();
            document.querySelector("#how-you-match-card-container")?.remove();
        } else if (
            jd &&
            resumeText &&
            chatGPTAccessToken &&
            jobId !== curKeywordJid &&
            !applied &&
            jd.length > 300
        ) {
            curKeywordJid = jobId;

            document
                .querySelectorAll(".chat-gpt-suggested-keywords-container")
                .forEach((el) => el.remove());
            document
                .querySelector(".upsell-premium-custom-section-card__container")
                ?.remove();
            document.querySelector("#how-you-match-card-container")?.remove();

            const userPrompt = jd;
            const container = document.querySelector(
                ".job-details-jobs-unified-top-card__container--two-pane div",
            );

            if (container) {
                const chatGPTContainer = document.createElement("div");
                chatGPTContainer.classList.add(
                    "chat-gpt-suggested-keywords-container",
                );

                const loadingStatus = document.createElement("div");
                loadingStatus.classList.add("loading-status");
                loadingStatus.textContent = "Job Turbo Loading keywords...";
                chatGPTContainer.appendChild(loadingStatus);
                container.appendChild(chatGPTContainer);

                try {
                    const response = await extractKeywords(
                        chatGPTAccessToken,
                        userPrompt,
                    );
                    console.log(response);
                    loadingStatus.remove();
                    document
                        .querySelector(
                            ".upsell-premium-custom-section-card__container",
                        )
                        ?.remove();
                    document
                        .querySelector("#how-you-match-card-container")
                        ?.remove();

                    const {keywords, summary} = response;

                    // Add summary section
                    const summaryContainer = document.createElement("div");
                    summaryContainer.classList.add("summary");
                    summaryContainer.innerHTML = summary;
                    chatGPTContainer.appendChild(summaryContainer);

                    // Create container for all keyword sections
                    const keywordsContainer = document.createElement("div");
                    keywordsContainer.classList.add("keywords-container");

                    // Process each category of keywords
                    const basicInfoSection = document.createElement("div");
                    basicInfoSection.classList.add("info-section");
                    const listSections = [];

                    function processKeywordValue(value) {
                        // If value is an array with objects
                        if (
                            Array.isArray(value) &&
                            value.length > 0 &&
                            typeof value[0] === "object"
                        ) {
                            const items = [];
                            value.forEach((obj) => {
                                Object.entries(obj).forEach(
                                    ([subKey, subValue]) => {
                                        // Handle arrays within objects
                                        if (Array.isArray(subValue)) {
                                            subValue.forEach((item) => {
                                                if (
                                                    item &&
                                                    typeof item === "string"
                                                ) {
                                                    items.push(
                                                        `${subKey}: ${item}`,
                                                    );
                                                }
                                            });
                                        }
                                        // Handle boolean values
                                        else if (
                                            typeof subValue === "boolean"
                                        ) {
                                            if (subValue) {
                                                items.push(subKey);
                                            }
                                        }
                                        // Handle string values
                                        else if (typeof subValue === "string") {
                                            items.push(
                                                `${subKey}: ${subValue}`,
                                            );
                                        }
                                    },
                                );
                            });
                            return items;
                        }
                        // If value is a simple array of strings
                        else if (Array.isArray(value)) {
                            return value.filter(
                                (item) => item && typeof item === "string",
                            );
                        }
                        // If value is a string
                        else if (typeof value === "string") {
                            return value;
                        }
                        // If value is an object
                        else if (typeof value === "object" && value !== null) {
                            const items = [];
                            Object.entries(value).forEach(([key, val]) => {
                                if (typeof val === "string") {
                                    items.push(`${key}: ${val}`);
                                } else if (typeof val === "boolean" && val) {
                                    items.push(key);
                                }
                            });
                            return items.length > 0 ? items : null;
                        }
                        return null;
                    }

                    // Update the keywords processing section
                    Object.entries(keywords).forEach(
                        ([category, keywordList]) => {
                            const processedValue =
                                processKeywordValue(keywordList);

                            if (!processedValue) return;

                            // If the processed value is an array
                            if (Array.isArray(processedValue)) {
                                if (processedValue.length === 0) return;

                                if (processedValue.length === 1) {
                                    // Single item goes to basic info
                                    const infoItem =
                                        document.createElement("div");
                                    infoItem.classList.add("info-item");

                                    const infoLabel =
                                        document.createElement("div");
                                    infoLabel.classList.add("info-label");
                                    infoLabel.textContent = category;

                                    const infoValue =
                                        document.createElement("div");
                                    infoValue.classList.add("info-value");
                                    infoValue.textContent = processedValue[0];

                                    infoItem.appendChild(infoLabel);
                                    infoItem.appendChild(infoValue);
                                    basicInfoSection.appendChild(infoItem);

                                    infoValue.addEventListener("click", () => {
                                        highlightKeywordInDiv(processedValue[0]);
                                    });
                                } else {
                                    // Multiple items go to list section
                                    const sectionDiv =
                                        document.createElement("div");
                                    sectionDiv.classList.add("info-section");

                                    const titleDiv =
                                        document.createElement("h2");
                                    titleDiv.classList.add("section-title");
                                    titleDiv.textContent = category;
                                    sectionDiv.appendChild(titleDiv);

                                    const ul = document.createElement("ul");
                                    processedValue.forEach((item) => {
                                        if (
                                            item &&
                                            typeof item === "string" &&
                                            item.trim()
                                        ) {
                                            const li =
                                                document.createElement("li");
                                            li.textContent = item;
                                            ul.appendChild(li);

                                            li.addEventListener("click", () => {
                                                highlightKeywordInDiv(item);
                                            });
                                        }
                                    });

                                    if (ul.children.length > 0) {
                                        sectionDiv.appendChild(ul);
                                        listSections.push(sectionDiv);
                                    }
                                }
                            }
                            // If the processed value is a string
                            else if (
                                typeof processedValue === "string" &&
                                processedValue.trim()
                            ) {
                                const infoItem = document.createElement("div");
                                infoItem.classList.add("info-item");

                                const infoLabel = document.createElement("div");
                                infoLabel.classList.add("info-label");
                                infoLabel.textContent = category;

                                const infoValue = document.createElement("div");
                                infoValue.classList.add("info-value");
                                infoValue.textContent = processedValue;

                                infoItem.appendChild(infoLabel);
                                infoItem.appendChild(infoValue);
                                basicInfoSection.appendChild(infoItem);

                                infoValue.addEventListener("click", () => {
                                    highlightKeywordInDiv(processedValue);
                                });
                            }
                        },
                    );

                    // Add the sections to the container only if they have content
                    if (basicInfoSection.children.length > 0) {
                        keywordsContainer.appendChild(basicInfoSection);
                    }
                    listSections.forEach((section) => {
                        keywordsContainer.appendChild(section);
                    });
                    chatGPTContainer.appendChild(keywordsContainer);
                } catch (error) {
                    console.error("Error:", error);
                    loadingStatus.textContent = "Error: " + error.message;
                    loadingStatus.style.animation = "";
                }
            }
        }
    }

    function addShortBadge() {
        // remove all .shortcut
        document.querySelectorAll(".shortcut").forEach((el) => el.remove());
        // for moving on to
        addShortcutText(ctrlZButtonSelectors, "Ctrl + X");
        // for positioning current job posting
        addShortcutText(
            [
                ".jobs-search-results-list__list-item--active .job-card-container__link strong",
            ],
            "Ctrl + Z(oning)",
        );
        addShortcutText(
            [".job-details-jobs-unified-top-card__job-title h1 a"],
            "Ctrl + D(ownload JD)",
        );
        addShortcutText(
            ['footer[role="presentation"] .display-flex .auto-fill-button'],
            "Ctrl + F(ill)",
        );
    }

    function startObserver() {
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

        const throttledCallback = throttle(async (mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === "childList") {
                    // predictCompatibility();
                    uncheckFollowCompanyCheckbox();
                    addShortBadge();
                    if (dismissApplicationSentModal()) {
                        filledForms = new Set();
                    }
                    fillForm(
                        personalInfo,
                        filledForms,
                        chatGPTAccessToken,
                        false,
                        document.querySelector("form"),
                        resumeText,
                    );
                    await analyzeKeyword(mutation);
                    break;
                }
            }
        }, 400);

        const observer = new MutationObserver(throttledCallback);
        observer.observe(document.body, {childList: true, subtree: true});
    }

    function downloadJD(applied = false, jd) {
        const blob = new Blob([jd], {type: "text/plain"});
        const url = URL.createObjectURL(blob);
        const currentJobId = new URL(window.location.href).searchParams.get(
            "currentJobId",
        );

        chrome.runtime.sendMessage({
            action: "download",
            url: url,
            filename: `LinkedinJD-${applied}-${currentJobId}.txt`,
        });
    }

    // Add shortcut text (Ctrl + X) to each button
    function addShortcutText(selectors, shortcutText) {
        selectors.forEach((selector) => {
            // Find all matching buttons for the current selector
            const buttons = document.querySelectorAll(selector);

            buttons.forEach((button) => {
                // Avoid adding the shortcut text multiple times
                if (!button.querySelector(".shortcut")) {
                    // Create the shortcut span
                    const shortcutSpan = document.createElement("span");
                    // add .shortcut and mr2 to the button
                    shortcutSpan.classList.add("shortcut", "mr2", "ml2");
                    shortcutSpan.textContent = ` ${shortcutText}`; // Add space before shortcut text

                    // Append the shortcut span to the button
                    button.appendChild(shortcutSpan);
                }
            });
        });
    }

    function selectAndClickNextLi() {
        let activeLi = document.querySelector(
            ".jobs-search-results-list__list-item--active",
        );
        if (!activeLi) {
            document.querySelector(".job-card-list").click();
            return;
        }

        let nextLi = activeLi.closest("li").nextElementSibling;
        let count = 0;

        let li = nextLi;
        while (li) {
            const viewedElement = li.querySelector(
                ".job-card-container__footer-job-state",
            );
            const text = viewedElement?.textContent.trim();
            if (!viewedElement || !["Viewed", "Applied"].includes(text)) {
                count += 1;
            }
            li = li.nextElementSibling;
        }
        if (count <= 2) {
            const element = document.querySelector(".jobs-search-results-list");
            element?.scrollTo({top: element.scrollHeight, behavior: "smooth"});
        }

        li = nextLi;
        while (li) {
            const viewedElement = li.querySelector(
                ".job-card-container__footer-job-state",
            );
            const text = viewedElement?.textContent.trim();

            if (!viewedElement || !["Viewed", "Applied"].includes(text)) {
                li.scrollIntoView({behavior: "smooth", block: "center"});
                const clickableElement = li.querySelector(
                    ".job-card-container--clickable",
                );
                if (clickableElement) {
                    clickableElement.click();
                    return;
                }
            }
            li = li.nextElementSibling;
        }

        const activePaginationLi = document.querySelector(
            ".artdeco-pagination__indicator.active",
        );
        const nextPaginationLi = activePaginationLi?.nextElementSibling;
        nextPaginationLi?.querySelector("button")?.click();
    }

    document.addEventListener("keydown", (event) => {
        const {ctrlKey, shiftKey, code} = event;
        if (ctrlKey && code === "KeyD") {
            event.preventDefault();
            makeRecord(false);
        } else if (ctrlKey && shiftKey && code === "KeyX") {
            event.preventDefault();
            if (
                !document.querySelector(
                    ".jobs-s-apply a.jobs-s-apply__application-link",
                )
            ) {
                makeRecord(false);
            }
            selectAndClickNextLi();
        } else if (ctrlKey && code === "KeyZ") {
            event.preventDefault();
            const activeLi = document.querySelector(
                ".jobs-search-results-list__list-item--active",
            );
            activeLi?.scrollIntoView({behavior: "smooth", block: "center"});
        } else if (ctrlKey && !shiftKey && code === "KeyX") {
            event.preventDefault();

            for (const selector of ctrlZButtonSelectors) {
                const button = document.querySelector(selector);
                if (button) {
                    if (selector.includes(".jobs-apply-button")) {
                        makeRecord(true);
                    }
                    button.click();
                    break;
                }
            }
        } else if (ctrlKey && code === "KeyC") {
            event.preventDefault();
            if (inspectMode) {
                inspector.disableInspectMode();
            } else {
                inspector.setDynamicFunction((selectedElement) => {
                    displayToast("loading");
                    makePredictionRequest(
                        resumeText,
                        "",
                        selectedElement.innerText,
                    )
                        .then((response) => {
                            displayToast(response.predicted_class === 1);
                        })
                        .catch((error) => {
                            displayToast(
                                error.message ||
                                    "An unexpected error occurred.",
                            );
                            console.error("Error:", error);
                        });
                });
                inspector.enableInspectMode();
            }
        } else if (inspectMode && code === "Escape") {
            event.preventDefault();
            inspector.disableInspectMode();
        }
    });

    function extractTextFromElement(selector) {
        const jobTitleElement = document.querySelector(
            ".job-details-jobs-unified-top-card__job-title a",
        );
        const jobTitle = jobTitleElement?.textContent.trim();
        const element = document.querySelector(selector);
        if (jobTitle && element) {
            return `${jobTitle}\n${element.innerText.trim()}`;
        } else {
            return "";
        }
    }

    function predictCompatibility() {
        const jobDescriptionEle = document.querySelector(
            ".jobs-box__html-content .mt4",
        );
        const jobId = new URL(window.location.href).searchParams.get(
            "currentJobId",
        );
        if (jobDescriptionEle && jobId !== curPredictionJid) {
            const jdText = extractTextFromElement(
                ".jobs-box__html-content .mt4",
            );
            const topCard = document.querySelector(
                ".job-details-jobs-unified-top-card__container--two-pane .mt4 div.display-flex",
            );
            const compatibleButton = document.querySelector(
                ".job-details-jobs-unified-top-card__container--two-pane .mt4 div.display-flex .evaluation",
            );
            if (!compatibleButton && topCard) {
                const jobsApplyDiv = document.createElement("div");
                jobsApplyDiv.classList.add(
                    "jobs-s-apply",
                    "inline-flex",
                    "ml2",
                );
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
                compatibleButton.querySelector("span").textContent =
                    "Evaluating ☕️";
                compatibleButton.disabled = true;
                if (!resumeText) {
                    compatibleButton.querySelector("span").textContent =
                        "upload Resume to Evaluate";
                } else {
                    makePredictionRequest(resumeText, "", jdText)
                        .then((response) => {
                            compatibleButton.disabled =
                                response.predicted_class !== 1;
                            compatibleButton.querySelector("span").textContent =
                                response.predicted_class === 1
                                    ? "Compatible 🎉"
                                    : "Incompatible 🙁";
                        })
                        .catch((error) => {
                            compatibleButton.querySelector("span").textContent =
                                error.message;
                        });
                }

                curPredictionJid = jobId;
            }
        }
    }

    async function makePredictionRequest(
        resumeText,
        resumePdfPath,
        jobDescriptionText,
    ) {
        const url = CONFIG.API_ENDPOINT;
        const data = {
            resume_text: resumeText,
            resume_pdf_path: resumePdfPath,
            job_description_text: jobDescriptionText,
        };

        const response = await fetch(`${url}/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        return await response.json();
    }

    const inspector = Inspector();

    async function makeRecord(applied) {
        const jd = extractTextFromElement(".jobs-box__html-content .mt4");
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
                const response = await createApplication(payload);
                console.log("Response from server:", response);
            } catch (error) {
                console.error("Upload failed:", error.message);
            }
        }
    }

    async function createApplication(payload) {
        const url = CONFIG.API_ENDPOINT;
        const response = await fetch(`${url}/applications`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                `Error ${response.status}: ${
                    errorData.detail || "Unknown error"
                }`,
            );
        }

        const data = await response.json();
        console.log("File uploaded successfully:", data);
        return data;
    }
})();
