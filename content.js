function extractData(key, dataExtractor) {
    console.log("Extracting data")
    let data = dataExtractor(document)
    let jsonMessage = {
        message: {
            type: "persist",
            key: key,
            data: data
        }
    };
    console.log(jsonMessage)
    chrome.runtime.sendMessage(jsonMessage)
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Received request: ", request);
    if (request.message.type === "update") {
        extractData("apr", doc => {
            return +doc.getElementsByClassName(["text-xl"])
                .item(1)
                .innerText.split('%')[0]
        })
        extractData("beetsPrice", doc => {
            return +doc.getElementsByClassName("text-red-500 font-semibold text-right")
                .item(0)
                .innerText
                .split('$')[1]
        })
        extractData("tvl", doc => {
            return +doc.getElementsByClassName("text-xl font-medium truncate flex items-center")
                .item(0)
                .innerText
                .split('$')[1]
                .split(',')
                .join('')
        }),
        extractData("currentMarketCap", doc => {
            return +doc.getElementsByClassName("font-semibold text-right")
                .item(2)
                .innerText
                .split('$')[1]
                .split(',')
                .join('')
        })
    }
    sendResponse({
        farewell: "goodbye"
    });
});
