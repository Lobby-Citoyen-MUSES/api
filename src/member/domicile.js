const aws = require('aws-sdk');
const ddb = new aws.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
    const user = {
        id: event.requestContext.authorizer.principalId,
        displayName: event.requestContext.authorizer.displayName,
        role: event.requestContext.authorizer.role
    };

    const address = JSON.parse(event.body);

    try {
        await domicileMember(user.id, address);
    } catch (error) {
        throw error;
    }

    return response(201);
}

async function domicileMember(id, address) {
    // should become conditional update in order to separate initial address domicile (POST) from later edit of the address (PUT)
    return await ddb.update({
        TableName: "members",
        Key: { "id": id },
        UpdateExpression: "set address.line1 = :line1, address.line2 = :line2, address.zip = :zip, address.locality = :locality",
        ExpressionAttributeValues: {
            ":line1": address.line1,
            ":line2": address.line2,
            ":zip": address.zip,
            ":locality": address.locality
        }
    }).promise()
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