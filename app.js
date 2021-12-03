const express = require("express");
const path = require("path");
const ejs = require("ejs");
const dotenv = require("dotenv");
const morgan = require("morgan");
// const cors = require("cors");
const {
    uuid
} = require("uuidv4");
const {
    Client,
    Config,
    CheckoutAPI
} = require("@adyen/api-library");

// init app
const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// app.use(cors());

// setup request logging
app.use(morgan("dev"));
// Parse JSON bodies
app.use(express.json());
// Parse URL-encoded bodies
app.use(express.urlencoded({
    extended: true
}));
// Serve client from build folder
app.use(express.static(path.join(__dirname, "/public")));

// enables environment variables by
// parsing the .env file and assigning it to process.env
dotenv.config({
    path: "./.env",
});

// register ejs view engine 
app.set('view engine', 'ejs');

// Adyen Node.js API library boilerplate (configuration, etc.)
const config = new Config();
config.apiKey = process.env.API_KEY;
const client = new Client({
    config
});
client.setEnvironment("TEST");
const checkout = new CheckoutAPI(client);

//API ENDPOINTS 

const paymentDataStore = {};

// get list of payment methods first with a json file
app.get("/", async (req, res) => {
    try {
        const response = await checkout.paymentMethods({
            channel: "Web",
            merchantAccount: process.env.MERCHANT_ACCOUNT,
        });
        // res.json(response); // test
        res.render("payment", {
            clientKey: process.env.CLIENT_KEY,
            response: JSON.stringify(response)
        })
    } catch (error) {
        console.log(error);
    }
});

app.post('/api/initiatePayment', async function (req, res) {
    try {
        const orderRef = uuid();

        const response = await checkout.payments({
            amount: {
                currency: "EUR",
                value: 1000
            },
            reference: orderRef,
            merchantAccount: process.env.MERCHANT_ACCOUNT,
            channel: "Web",
            additionalData: {
                allow3DS2: true
            },
            returnUrl: `http//localhost:8080/api/handleShopperRedirect?orderRef=${orderRef}`,
            browserInfo: req.body.browserInfo,
            paymentMethod: req.body.paymentMethod
        })
        let resultCode = response.resultCode;
        let action = null;

        // if clients needs additional action to finalize the payment like paying IDEAL
        if (response.action) {
            actions = response.action;
            paymentDataStore[orderRef] = action.paymentData;
        }

        res.json({
            resultCode,
            action
        });
    } catch (error) {
        console.error(error);

    }
});

// method for redirecting the client
app.all('/api/handle/ShopperRedirect', async function (req, res) {
    const payload = {};
    payload['details'] = req.method === 'GET' ? req.query : req.body;

    const orderRef = req.query.orderRef;
    payload["paymentData"] = paymentDataStore[orderRef];
    delete paymentDataStore[orderRef];

    try {
        const response = await checkout.paymentsDetails(paylod);

        switch (response.resultCode) {
            case "Authorised":
                res.redirect("/success");
                break;
            case "Pending":
            case "Received":
                res.redirect("/processing");
                break;
            case "Pefused":
                res.redirect("/not_processed");
                break;
            default:
                res.redirect("/error")
                break;
        }
    } catch (error) {
        console.log(error);
    }
});

// redirect method for inserting additional details
app.post('/api/submitAdditionalDetails', async function (req, res) {
    const payload = {};
    payload['details'] = req.body.details;
    payload['paymentData'] = req.body.paymentData;

    try {
        const response = await checkout.paymentsDetails(payload);

        let resultCode = response.resultCode;
        let action = response.action || null;

        res.json({
            action,
            resultCode
        });
    } catch (error) {
        console.error(error);
    }
})

// user routes
app.get("/success", (req, res) => res.render("success"));
app.get("/pending", (req, res) => res.render("processing"));
app.get("/error", (req, res) => res.render("error"));
app.get("/not-paid", (req, res) => res.render("not-processed"));


const port = process.env.PORT || 8080
app.listen(port, function () {
    console.log(`Server listening on port ${port}...`)
})