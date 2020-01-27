const queryString = require('querystring');
const aws = require('aws-sdk');
const ddb = new aws.DynamoDB.DocumentClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sm = new aws.SecretsManager({ region: process.env.AWS_REGION });
let jwtPrivateKey;

exports.handler = async (event, context) => {   
    const attempt = queryString.parse(event.body);
    if (!("grant_type" in attempt && "username" in attempt && "password" in attempt)) {
        return response(400);
    }

    if (attempt.grant_type !== 'password') {
        return response(400, { 'error': 'unsupported_grant_type'});
    }

    let results = await fetchCredentials(attempt.username);
    if (results.Items.length === 0) {
        return response(401);
    }
    if (results.Items.length > 1) {
        return response(500);
    }

    const credentials = results.Items[0];
    if (!bcrypt.compareSync(attempt.password, credentials.password)) {
        return response(400, {'error': 'invalid_grant'});
    }

    results = await fetchMember(credentials.memberId);
    if (results.Items.length !== 1) {
        return response(500);
    }

    const member = results.Items[0];
    const token = jwt.sign(
        {id: member.id, role: credentials.level, displayName: member.displayName},
        await getJwtPrivateKey(),
        { algorithm: process.env.JWT_SIGN_ALGORITHM, expiresIn: '30d' }
    );

    return response(200, { access_token: token, token_type: "Bearer", expires_in: 86400 * 30});
};

async function fetchCredentials(email) {
    return await ddb.query({
        TableName: "credentials",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: {
            ":email": email
        }
    }).promise()
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

async function getJwtPrivateKey() {
    if (!jwtPrivateKey) {
        jwtPrivateKey = await new Promise((resolve, reject) => {
            sm.getSecretValue({ SecretId: process.env.JWT_PRIVATE_KEY }, function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data.SecretString);
                }
            });
        });
    }

    return jwtPrivateKey;
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