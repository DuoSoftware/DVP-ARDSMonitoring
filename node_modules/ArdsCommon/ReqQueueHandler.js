var util = require('util');
var redisHandler = require('./RedisHandler.js');
var requestHandler = require('./RequestHandler.js');
var infoLogger = require('./InformationLogger.js');

var AddRequestToQueue = function (logKey, request, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start AddRequestToQueue *************************', logKey);

    var hashKey = util.format('ProcessingHash:%d:%d', request.Company, request.Tenant);
    redisHandler.CheckHashFieldExists(logKey, hashKey, request.QueueId, function (err, result) {
        if (err) {
            console.log(err);
            callback(err, "Failed");
        }
        else if (result == "1") {
            redisHandler.AddItemToListR(logKey, request.QueueId, request.SessionId, function (err, result) {
                if (err) {
                    console.log(err);
                    callback(err, "Failed");
                }
                else {
                    if (parseInt(result) > 0) {
                        requestHandler.SetRequestState(logKey, request.Company, request.Tenant, request.SessionId, "QUEUED", function (err, result) {
                            console.log("set Request State QUEUED");
                        });
                        callback(err, "OK");
                    }
                    else {
                        callback(err, "Failed");
                    }
                }
            });
        }
        else {
            redisHandler.AddItemToHash(logKey, hashKey, request.QueueId, request.SessionId, function (err, result) {
                if (err) {
                    console.log(err);
                    callback(err, "Failed");
                }
                else {
                    requestHandler.SetRequestState(logKey, request.Company, request.Tenant, request.SessionId, "QUEUED", function (err, result) {
                        console.log("set Request State QUEUED");
                    });
                    callback(err, "OK");
                }

            });
        }
    });
};

var ReAddRequestToQueue = function (logKey, request, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start ReAddRequestToQueue *************************', logKey);

    var hashKey = util.format('ProcessingHash:%d:%d', request.Company, request.Tenant);
    redisHandler.CheckHashFieldExists(logKey, hashKey, request.QueueId, function (err, result) {
        if (err) {
            console.log(err);
            callback(err, "Failed");
        }
        else if (result == "1") {
            redisHandler.AddItemToListL(logKey, request.QueueId, request.SessionId, function (err, result) {
                if (err) {
                    console.log(err);
                    callback(err, "Failed");
                }
                else {
                    if (parseInt(result) > 0) {
                        requestHandler.SetRequestState(logKey, request.Company, request.Tenant, request.SessionId, "QUEUED", function (err, result) {
                        });
                        callback(err, "OK");
                    }
                    else {
                        callback(err, "Failed");
                    }
                }
            });
        }
        else {
            redisHandler.AddItemToHash(logKey, hashKey, request.QueueId, request.SessionId, function (err, result) {
                if (err) {
                    console.log(err);
                    callback(err, "Failed");
                }
                else {
                     requestHandler.SetRequestState(logKey, request.Company, request.Tenant, request.SessionId, "QUEUED", function (err, result) {
                    });
                    callback(err, "OK");
                }
            });
        }
    });
};

var RemoveRequestFromQueue = function (logKey, queueId, sessionId, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start RemoveRequestFromQueue *************************', logKey);

    redisHandler.RemoveItemFromList(logKey, queueId, sessionId, function (err, result) {
        if (err) {
            console.log(err);
        }
        callback(err, result);
    });
};

var GetNextRequestToProcess = function (logKey, queueId, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start GetNextRequestToProcess *************************', logKey);

    redisHandler.GetItemFromList(logKey, queueId, function (err, result) {
        if (err) {
            console.log(err);
        }
        callback(err, result);
    });
};

var SetNextProcessingItem = function (logKey, queueId, processingHashId) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start SetNextProcessingItem *************************', logKey);

    redisHandler.GetItemFromList(logKey, queueId, function (err, nextQueueItem) {
        if (err) {
            console.log(err);
        }
        else {
            if (nextQueueItem == "") {
                redisHandler.RemoveItemFromHash(logKey, processingHashId, queueId, function (err, result) {
                    if (err) {
                        console.log(err);
                    }
                    else {
                        if (result == "1") {
                            console.log("Remove HashField Success.." + _processingHash + "::" + _queueId);
                        }
                        else {
                            console.log("Remove HashField Failed.." + _processingHash + "::" + _queueId);
                        }
                    }
                });
            }
            else {
                redisHandler.AddItemToHash(logKey, processingHashId,queueId, nextQueueItem,function(err,result){
                    if (err) {
                        console.log(err);
                    }
                    else {
                        if (result == "1") {
                            console.log("Set HashField Success.." + _processingHash + "::" + _queueId + "::" + nextQueueItem);
                        }
                        else {
                            console.log("Set HashField Failed.." + _processingHash + "::" + _queueId + "::" + nextQueueItem);
                        }
                    }
                });
            }
        }
    });
};

module.exports.AddRequestToQueue = AddRequestToQueue;
module.exports.ReAddRequestToQueue = ReAddRequestToQueue;
module.exports.RemoveRequestFromQueue = RemoveRequestFromQueue;
module.exports.GetNextRequestToProcess = GetNextRequestToProcess;
module.exports.SetNextProcessingItem = SetNextProcessingItem;