chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request);
    if (request.action === "download") {
        chrome.downloads.download(
            {
                url: request.url,
                filename: request.filename,
                saveAs: false,
            },
            (downloadId) => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                } else {
                    console.log(`Download started with ID: ${downloadId}`);
                }
            },
        );
    } else if (request.action === "forwardToContentScript") {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(
                    tabs[0].id,
                    request.message,
                    sendResponse,
                );
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
                // Send message to content script
                chrome.tabs.sendMessage(tabId, {action: command});
            } catch (error) {
                console.error(
                    "Error injecting files or sending message:",
                    error,
                );
            }
        });
    }
});
