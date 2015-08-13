var redisHandler = require('./RedisHandler.js');
var util = require('util');
var infoLogger = require('./InformationLogger.js');

var SetResourceState = function (logKey, company, tenant, resourceId, state, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start SetResourceState *************************', logKey);
    
    processState(state, function (err, result) {
        if (err != null) {
            console.log(err);
        }
        else {
            var StateKey = util.format('ResourceState:%d:%d:%s', company, tenant, resourceId);
            redisHandler.SetObj(logKey, StateKey, result, function (err, result) {
                if (err != null) {
                    console.log(err);
                }
                else {
                    callback(err, result);
                }
            });
        }
    });
};

var processState = function (state, callback) {
    callback(null, state);
};

module.exports.SetResourceState = SetResourceState;