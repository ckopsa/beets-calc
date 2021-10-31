chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Received request: ", request);

    if (request.message.type === "persist") {
        console.log(request);
        let key = request.message.key;
        chrome.storage.sync.set({
            [key]: request.message.data
        });
        chrome.storage.sync.get(key, result => {
            console.log(key, result);
        });
    }
    sendResponse({
        farewell: "goodbye"
    });
});


chrome.tabs.onActivated.addListener(tab => {
    chrome.tabs.get(tab.tabId, currentTabInfo => {
        if (/^https:\/\/app\.beethovenx/.test(currentTabInfo.url) &&
            currentTabInfo.status === "complete") {
            chrome.tabs.executeScript(null, {
                file: './content.js'
            }, () => console.log("I injected!"));
        }
    });
});

chrome.tabs.onUpdated.addListener((tabId) => {
    chrome.tabs.get(tabId, currentTabInfo => {
        if (/^https:\/\/app\.beethovenx/.test(currentTabInfo.url) &&
            currentTabInfo.status === "complete") {
            chrome.tabs.executeScript(null, {
                file: './content.js'
            }, () => console.log("I injected!"));
        }
    });
});