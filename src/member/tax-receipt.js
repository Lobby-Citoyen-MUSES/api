const aws = require('aws-sdk');
const ddb = new aws.DynamoDB.DocumentClient();
const sm = new aws.SecretsManager({ region: process.env.AWS_REGION });
let stripe;


exports.handler = async (event, context) => {
    const user = {
        id: event.requestContext.authorizer.principalId,
        displayName: event.requestContext.authorizer.displayName,
        role: event.requestContext.authorizer.role
    };

    let results = await fetchMember(user.id)
    if (results.Items.length !== 1) {
        console.error("Unable to fetch member");
        return response(500);
    }

    const member = results.Items[0];

    console.log(member);

    if (!member.address.hasOwnProperty('zip') || !member.address.hasOwnProperty('locality')) {
        return response(409);
    }

    if (!stripe) {
        await initStripe();
    }

    results = await fetchStripeCustomers(member.email);
    if (results.data.length === 0) {
        return response(404);
    }

    const receipt = {
        id: '2019-' + user.id,
        donator: {
            firstname: member.firstname,
            lastname: member.lastname,
            address: {
                line1: member.address.line1,
                line2: member.address.line2,
                zip: member.address.zip,
                locality: member.address.locality
            }
        },
        donations: []
    };

    const startFiscalYear = Math.round(((new Date(2019, 00, 01, 00, 00, 00)).getTime()) / 1000);
    const endFiscalYear = Math.round(((new Date(2019, 11, 31, 23, 59, 59)).getTime()) / 1000);

    for (const customer of results.data) {
        let invoicesResults = await fetchStripeInvoices(customer);
        if (invoicesResults.data.length === 0) {
            continue;
        }

        for (const invoice of invoicesResults.data) {
            if (invoice.charge.created >= startFiscalYear && invoice.charge.created <= endFiscalYear) {
                const date = new Date();
                date.setTime(invoice.charge.created * 1000);

                receipt.donations.push({
                    date: date.toISOString(),
                    amount: invoice.amount_paid
                });
            }
        }
    }

    return response(200, receipt);
}

async function fetchMember(id) {
    return await ddb.query({
        TableName: "members",
        KeyConditionExpression: "id = :id",
        ExpressionAttributeValues: {
            ":id": id
        }
    }).promise()
}

async function initStripe() {
    if (!stripe) {
        const stripeSecretKey = await new Promise((resolve, reject) => {
            sm.getSecretValue({ SecretId: process.env.STRIPE_RESTRICTED_KEY }, function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data.SecretString);
                }
            });
        });

        stripe = require('stripe')(stripeSecretKey);
    }

    return stripe;
}

async function fetchStripeCustomers(email) {
    return await stripe.customers.list({ email: email });
}

async function fetchStripeInvoices(customer) {
    return await stripe.invoices.list({ customer: customer.id, status: "paid", expand: ['data.charge'] });
}

function response(code, body, headers) {
    return {
        statusCode: code,
        body: JSON.stringify(body),
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    };
}