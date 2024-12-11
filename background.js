chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request);
    if (request.action === 'download') {
        chrome.downloads.download({
            url: request.url,
            filename: request.filename,
            saveAs: false
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
            } else {
                console.log(`Download started with ID: ${downloadId}`);
            }
        });
    } else if (request.action === 'forwardToContentScript') {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, request.message, sendResponse);
            }
        });
        return true; // Keeps the message channel open
    }
});

chrome.commands.onCommand.addListener((command) => {
    console.log(command);
    if (command === "fill-form" || command === "fill-form-select") {
        chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
            if (!tabs[0] || !tabs[0].id) {
                console.error("No active tab found.");
                return;
            }

            const tabId = tabs[0].id;

            try {
                // Check if contentScript.js is already injected
                const isInjected = await chrome.scripting.executeScript({
                    target: {tabId},
                    func: () => !!window.__contentScriptInjected, // Check for the marker
                });

                if (isInjected[0].result) {
                    console.log("contentScript.js is already injected. Skipping.");
                } else {
                    console.log("Injecting files and sending message to content script...");
                    // Inject CSS files
                    const cssFiles = [
                        "popup/keywords.css",
                        "content/inspection_mode.css",
                        "content/toast.css",
                    ];
                    for (const cssFile of cssFiles) {
                        await chrome.scripting.insertCSS({
                            target: {tabId},
                            files: [cssFile],
                        });
                    }

                    // Inject JS files
                    const jsFiles = [
                        "scripts/config.js",
                        "scripts/chatGPT.js",
                        "content/fuzzyFindElement.js",
                        "content/toast.js",
                        "content/analyzeKeyword.js",
                        "content/findLca.js",
                        "content/inspection_mode.js",
                        "content/autoFormFill.js",
                        "content/contentScript.js"
                    ];
                    for (const jsFile of jsFiles) {
                        await chrome.scripting.executeScript({
                            target: {tabId},
                            files: [jsFile],
                        });
                    }
                }

                // Send message to content script
                chrome.tabs.sendMessage(tabId, {action: command});
            } catch (error) {
                console.error("Error injecting files or sending message:", error);
            }
        });
    }
});