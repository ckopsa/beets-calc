function addMonths(date, months) {
    var d = date.getDate();
    date.setMonth(date.getMonth() + +months);
    if (date.getDate() !== d) {
        date.setDate(0);
    }
    return date;
}

async function getFromStorage(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(key, resolve);
    })
        .then(result => {
            if (key == null) return result;
            else return result[key];
        });
}

function update() {
    ["apr", "beetsPrice", "tvl", "currentMarketCap"].forEach(key => {
        chrome.storage.sync.get(key, result => {
            console.log(key, result[key]);
            let htmlElement = document.getElementById(key);
            htmlElement.innerText = null
            htmlElement.innerText = result[key]
        });
    })
}

document.getElementById("update").addEventListener("click", () => {
    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, (tabs) => {
        let activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, {
            message: {
                type: "update"
            }
        }).then(() => {
            update();
        });
    });
});

["initialInvestment", "tvlChange", "beetsChange"].forEach(inputField => {
    document.getElementById(inputField).addEventListener("input", () => {
        let inputData = document.getElementById(inputField).value
        chrome.storage.sync.set({
            [inputField]: inputData
        })
        chrome.storage.sync.get(inputField, result => {
            console.log(inputField, result[inputField]);
        });
    })
})
document.getElementById("update").addEventListener("click", () => {
    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, (tabs) => {
        let activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, {
            message: {
                type: "update"
            }
        }).then(() => {
            update();
        });
    });
});

/**
 * TODO - FTM Blocktime
 * TODO - Snazzy UI Snoozle
 * TODO - Snazzy Graph
 * TODO - Refactoring code to be more readable
 */
document.getElementById("calculate").addEventListener("click", () => {
    let fun = async () => {
        // Data from extension
        let currentMarketCap = await getFromStorage("currentMarketCap").then(it => +it)
        let beetsPrice = await getFromStorage("beetsPrice").then(it => +it)
        let tvlCapture = +(await getFromStorage("tvlChange"))
        let principal = +(await getFromStorage("initialInvestment"));
        let apr = +(await getFromStorage("apr").then(it => (+it) / 100))
        let marketCapGrowthPerMonth = 15000000 // TODO Adjustable from UI

        // Data from server
        let tvlFtmBeets = +await fetch("https://graph-node.beets-ftm-node.com/subgraphs/name/beethovenx", {
            method: "POST",
            body: JSON.stringify({'query': '{ pool(id:"0xcde5a11a4acb4ee4c805352cec57e236bdbc3837000200000000000000000019") { name, totalLiquidity, id}}'})
        })
            .then(it => it.json())
            .then(json => json['data']['pool']['totalLiquidity'])
            .then(totalLiquidity => +totalLiquidity)

        // Needs to be updated dynamically
        let blocksPerSecondFtm = .87;
        let emissionPoolWeight = .3012
        // Magic Numbers
        let SECONDS_IN_YEAR = 31536000
        let EMISSION_LIST = [5.05, 5.02, 4.98, 4.90, 4.75, 4.50, 4.00, 3.40, 2.80, 2.30, 2, 1.80]
        let INFLATION_SUPPLY = [13089600, 13011840, 12908160, 12700800, 12312000, 11664000, 10368000, 8812800, 7257600, 5961600, 5184000, 4665600]
        let STARTING_TOKEN_SUPPLY = 5000000
        let timesCompoundInterest = 360
        let exponentiation = (1 + (apr / timesCompoundInterest));
        var today = new Date()

        // Accumulators from loop
        let totalTokenSupply = 0
        let marketCapBool = true
        let amountList = []
        today = new Date(today.setDate(today.getDate() - 30))
        console.log(today)
        amountList.push({
            amount: principal,
            date: today
        })


        // HTML Element to add to
        let ul = document.getElementById("list");

        // Counters
        let emissionCounter = 0
        let inflationCounter = 0

        for (const emission of EMISSION_LIST) {
            today = new Date(today.setDate(today.getDate() + 30))
            console.log(today)
            console.log("Emission" + emission)
            console.log("Emission" + tvlFtmBeets)
            let interestRate = (emission * emissionPoolWeight * beetsPrice * blocksPerSecondFtm * SECONDS_IN_YEAR / tvlFtmBeets)
            console.log("Interest Rate" + interestRate)
            for (let l = 0; l < 30; l++) {
                emissionCounter = emissionCounter + 1
                if (emissionCounter !== 360) {
                    exponentiation = exponentiation * (1 + (interestRate / timesCompoundInterest))
                }
            }
            console.log("Exponentiation" + exponentiation)

            if (!!marketCapBool === true) {
                totalTokenSupply = STARTING_TOKEN_SUPPLY + INFLATION_SUPPLY[inflationCounter]
                marketCapBool = false
            } else {
                totalTokenSupply = totalTokenSupply + INFLATION_SUPPLY[inflationCounter]
            }
            console.log("Total token supply" + totalTokenSupply)
            currentMarketCap += marketCapGrowthPerMonth //+ INFLATION_SUPPLY[inflationCounter] * beetsChange
            console.log("Current Market Cap" + currentMarketCap)
            let oldBeetsPrice = beetsPrice
            beetsPrice = currentMarketCap / totalTokenSupply
            console.log("Beets Price" + beetsPrice)
            let beetChange = beetsPrice / oldBeetsPrice
            console.log("Beets Change" + beetChange)
            principal = principal * beetChange * exponentiation

            let dataPiece = {
                amount: +principal.toFixed(2),
                date: today
            };

            console.log(dataPiece)
            amountList.push(dataPiece)


            principal = principal / exponentiation
            tvlFtmBeets = tvlFtmBeets + ((INFLATION_SUPPLY[inflationCounter] * beetsPrice) * tvlCapture) * .8

            inflationCounter = inflationCounter + 1
        }

        // Assign the specification to a local variable vlSpec.
        var vlSpec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
            title: "Investment Growth",
            width: 500,
            height: 500,
            data: {
                values: amountList
            },
            layer: [
                {
                    mark: {type: "line"},
                    encoding: {
                        y: {field: 'amount', type: 'quantitative'},
                        x: {field: 'date', type: 'temporal',}
                    }
                },
                {
                    mark: {type: "point", tooltip: true},
                    encoding: {
                        y: {field: 'amount', type: 'quantitative'},
                        x: {field: 'date', type: 'temporal',}
                    }
                }

            ],
        };

        // Embed the visualization in the container with id `vis`
        vegaEmbed('#vis', vlSpec);
    }
    fun()
});

update();
