const aws = require('aws-sdk');
const ddb = new aws.DynamoDB.DocumentClient();
const stripe = require('stripe')('sk_test_sg177E0Vs2Uff6Slp9vD107Q00ACVXanjH');


exports.handler = async (event, context) => {
    const user = {
        id: event.requestContext.authorizer.principalId,
        displayName: event.requestContext.authorizer.displayName,
        role: event.requestContext.authorizer.role
    };

    let results = await fetchMember(user.principalId)
    if (results.Items.length !== 1) {
        console.error("Unable to fetch member");
        return response(500);
    }

    const member = results.Items[0];

    results = await fetchStripeCustomers(member.email);
    if (results.data.length === 0) {
        return response(404);
    }

    const receipt = {
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

    const startFiscalYear = Math.round(((new Date(2019, 01, 01, 00, 00, 00)).getTime()) / 1000);
    const endFiscalYear = Math.round(((new Date(2019, 12, 31, 23, 59, 59)).getTime()) / 1000);

    for (const customer of results.data) {
        let invoicesResults = fetchStripeInvoices(customer);
        if (invoicesResults.data.length === 0) {
            continue;
        }

        for (const invoice of invoicesResults.data) {
            if (charge.created >= startFiscalYear && charge.created <= endFiscalYear) {
                receipt.donations.push({
                    date: invoice.charge.created,
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
        Key: {"id": id}
    }).promise()
}

async function fetchStripeCustomers(email) {
    return await stripe.customers.list({ email: email }).promise();
}

async function fetchStripeInvoices(customerId) {
    return await stripe.invoices.list({ customer: customerId, status: "paid", expand: ['charge'] }).promise();
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