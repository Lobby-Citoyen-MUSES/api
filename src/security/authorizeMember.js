const jwt = require('jsonwebtoken');

exports.handler = async (event, context) => {   
    const hash = event.authorizationToken.split('Bearer')[1].trim();
    var token;

    try {
        token = jwt.verify(hash, process.env.JWT_PUBLIC_KEY, { algorithm: process.env.JWT_SIGN_ALGORITHM });
    } catch (error) {
        switch (error.errorType) {
            case "TokenExpiredError":
                /*
                    err = {
                    name: 'TokenExpiredError',
                    message: 'jwt expired',
                    expiredAt: 1408621000
                    }
                */
            case "JsonWebTokenError":
                /*
                    err = {
                    name: 'JsonWebTokenError',
                    message: 'jwt malformed'
                    }
                */
                throw error
            case "NotBeforeError":
                /*
                    err = {
                    name: 'NotBeforeError',
                    message: 'jwt not active',
                    date: 2018-10-04T16:10:44.000Z
                    }
                */
            default:
                throw "Unauthorized"; // HTTP 403
        }
    }

    if (token.role !== 'member') {
        return Promise.resolve(generatePolicy(token, 'Deny', event.methodArn)); // HTTP 403
    }

    return Promise.resolve(generatePolicy(token, 'Allow', event.methodArn)); // HTTP 200
}

function generatePolicy (token, effect, resource) {
    if (!effect || !resource) {
        throw new 'Invalid policy';
    }

    return {
        principalId: token.id,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: "execute-api:Invoke",
                    Effect: effect,
                    Resource: resource,
                }
            ]
        },
        context: {
            role: token.role,
            displayName: token.displayName
        }
    };
}