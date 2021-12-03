async function callServer(url, data) {
    try {
        const response = await fetch(url, {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body, 'utf8'),
                'X-Api-Key': API_KEY
            },
        });
        return await response.json();
    } catch (error) {
        console.error(error);
    }
}

function handleServerResponse(res, dropin) {
    if (res.action) {
        dropin.handleAction(res.action);
    } else {
        switch (res.resultCode) {
            case "Authorised":
                window.location.href = "/success";
                break;
            case "Processing":
                window.location.href = "/processing";
                break;
            case "Refused":
                window.location.href = "/not-processed";
                break;
                // handle default error result
            default:
                window.location.href = "/error";
                break;
        }
    }
}

async function handleSubmission(state, dropin, url) {
    try {
        const response = await callServer(url, state.date);
        return handleServerResponse(response, dropin);
    } catch (error) {
        console.error(error);
    }
}

const paymentMethodsResponse = JSON.parse(document.getElementById("paymentMethodsResponse").innerHTML);
const clientKey = document.getElementById("clientKey").innerHTML;

const configuration = {
    paymentMethodsResponse,
    clientKey,
    locale: "en-US",
    environment: 'test',
    paymentMethodsConfiguration: {
        card: {
            hasHolderName: true
        }
    },
    onsubmit: (state, dropin) => {
        handleSubmission(state, dropin, "/api/initiatePayment");
    },
    onAdditionalDetails: (state, dropin) => {
        handleSubmission(state, dropin, "/api/submitAdditionalDetails");
    }
}

const checkout = new AdyenCheckout(configuration);
const integration = checkout.create("dropin").mount(document.getElementById("dropin"));