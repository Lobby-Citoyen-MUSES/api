const jwt = require('jsonwebtoken');

exports.handler = async (event, context) => {   
    const token = event.authorizationToken;

    try {
        const decoded = jwt.verify(token, process.env.JWT_PUBLIC_KEY, { algorithm: process.env.JWT_SIGN_ALGORITHM });
    } catch (error) {
        switch (error.name) {
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

    if (decoded.payload.level !== 'member') {
        return generatePolicy(decoded.payload, 'Deny', event.methodArn); // HTTP 403
    }

    return generatePolicy(decoded.payload, 'Allow', event.methodArn); // HTTP 200
}

function generatePolicy (token, effect, resource) {
    if (!effect || !resource) {
        throw new 'Invalid policy';
    }

    return authorization = {
        principalId: token.id,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: effect,
                    Resource: Resource,
                }
            ]
        },
        context: {
            id: token.id,
            role: token.level,
            displayName: token.username
        }
    };
}