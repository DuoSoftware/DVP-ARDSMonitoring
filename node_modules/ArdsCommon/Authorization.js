var infoLogger = require('./InformationLogger.js');

var ValidateAuthToken = function (authHeader, callback) {
    var tenantId = 1;
    var companyId = 1;
    try {
        var authInfo = authHeader.split("#");
        
        if (authInfo.length >= 2) {
            tenantId = authInfo[0];
            companyId = authInfo[1];
        }
    }
    catch (ex) {
        infoLogger.ReqResLogger.log('error', 'Exception occurred -  Data - %s ', "authorization", ex);
    }
    callback(companyId, tenantId);
};


module.exports.ValidateAuthToken = ValidateAuthToken;