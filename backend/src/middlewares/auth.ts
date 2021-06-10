import jwt = require('express-jwt');              // JWT parsing middleware for express


// We create the JWT authentication middleware
// provided by the express-jwt library.
//
// How it works (from the official documentation):
// If the token is valid, req.user will be set with the JSON object
// decoded to be used by later middleware for authorization and access control.
//
const auth = jwt({
  secret: process.env.JWT_SECRET as string,
  algorithms: ['HS256'],
});
export default auth;
