const jwt = require('jsonwebtoken');

exports.handler = async (event, context) => {   
    try {
        jwt.verify(token, process.env.JWT_PUBLIC_KEY, { algorithm: process.env.JWT_SIGN_ALGORITHM });
    } catch (error) {
        return response(403, error);
    }
}