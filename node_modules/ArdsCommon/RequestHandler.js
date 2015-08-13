var util = require('util');
var redisHandler = require('./RedisHandler.js');
var sortArray = require('./SortArray.js');
var reqQueueHandler = require('./ReqQueueHandler.js');
var resourceHandler = require('./ResourceHandler.js');
var preProcessHandler = require('./PreProcessor.js');
var infoLogger = require('./InformationLogger.js');

var AddRequest = function (logKey, requestObj, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start AddRequest *************************', logKey);
            
    var key = util.format('Request:%d:%d:%s', requestObj.Company, requestObj.Tenant, requestObj.SessionId);
    var tag = ["company_" + requestObj.Company, "tenant_" + requestObj.Tenant, "class_" + requestObj.Class, "type_" + requestObj.Type, "category_" + requestObj.Category, "sessionid_" + requestObj.SessionId, "reqserverid_" + requestObj.RequestServerId, "priority_" + requestObj.Priority, "servingalgo_" + requestObj.ServingAlgo, "handlingalgo_" + requestObj.HandlingAlgo, "selectionalgo_" + requestObj.SelectionAlgo, "objtype_Request"];
    
    var tempAttributeList = [];
    for (var i in requestObj.AttributeInfo) {
        var atts = requestObj.AttributeInfo[i].AttributeCode;
        for (var j in atts) {
            tempAttributeList.push(atts[j]);
        }
    }
    var sortedAttributes = sortArray.sortData(tempAttributeList);
    for (var k in sortedAttributes) {
        tag.push("attribute_" + sortedAttributes[k]);
    }
    
    var jsonObj = JSON.stringify(requestObj);
    
    redisHandler.AddObj_V_T(key, jsonObj, tag, function (err, reply, vid) {
        if (err) {
            console.log(err);
        }
        SetRequestState(requestObj.Company, requestObj.Tenant, requestObj.SessionId, "N/A", function (err, result) {
        });
        callback(err, reply, vid);
    });
};

var SetRequest = function (logKey, requestObj, cVid, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start SetRequest *************************', logKey);

    var key = util.format('Request:%d:%d:%s', requestObj.Company, requestObj.Tenant, requestObj.SessionId);
    redisHandler.CheckObjExists(logKey, key, function (err, result) {
        if (err) {
            console.log(err);
            callback(err, null, 0);
        }
        else if (result == "1") {
            var tag = ["company_" + requestObj.Company, "tenant_" + requestObj.Tenant, "class_" + requestObj.Class, "type_" + requestObj.Type, "category_" + requestObj.Category, "objtype_Request", "sessionid_" + requestObj.SessionId, "reqserverid_" + requestObj.RequestServerId, "priority_" + requestObj.Priority, "servingalgo_" + requestObj.ServingAlgo, "handlingalgo" + requestObj.HandlingAlgo, "selectionalgo" + requestObj.SelectionAlgo];
            var tempAttributeList = [];
            for (var i in requestObj.AttributeInfo) {
                var atts = requestObj.AttributeInfo[i].AttributeCode;
                for (var j in atts) {
                    tempAttributeList.push(atts[j]);
                }
            }
            var sortedAttributes = sortArray.sortData(tempAttributeList);
            for (var k in sortedAttributes) {
                tag.push("attribute_" + sortedAttributes[k]);
            }
            var jsonObj = JSON.stringify(requestObj);
            
            redisHandler.SetObj_V_T(logKey, key, jsonObj, tag, cVid, function (err, reply, vid) {
                infoLogger.DetailLogger.log('info', '%s Finished SetRequest. Result: %s', logKey, reply);
                callback(err, reply, vid);
            });
        }
        else {            
            infoLogger.DetailLogger.log('info', '%s Finished SetRequest. Result: %s', logKey, "Set Failed- No Existing Obj");
            callback(null, "Set Failed- No Existing Obj", 0);
        }
    });
};

var RemoveRequest = function (logKey, company, tenant, sessionId, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start RemoveRequest *************************', logKey);

    var key = util.format('Request:%s:%s:%s', company, tenant, sessionId);
    redisHandler.GetObj(logKey, key, function (err, obj) {
        if (err) {
            callback(err, "false");
        }
        else {
            var requestObj = JSON.parse(obj);
            var tag = ["company_" + requestObj.Company, "tenant_" + requestObj.Tenant, "class_" + requestObj.Class, "type_" + requestObj.Type, "category_" + requestObj.Category, "objtype_Request", "sessionid_" + requestObj.SessionId, "reqserverid_" + requestObj.RequestServerId, "priority_" + requestObj.Priority, "servingalgo_" + requestObj.ServingAlgo, "handlingalgo_" + requestObj.HandlingAlgo, "selectionalgo_" + requestObj.SelectionAlgo];
            var tempAttributeList = [];
            for (var i in requestObj.AttributeInfo) {
                var atts = requestObj.AttributeInfo[i].AttributeCode;
                for (var j in atts) {
                    tempAttributeList.push(atts[j]);
                }
            }
            var sortedAttributes = sortArray.sortData(tempAttributeList);
            for (var k in sortedAttributes) {
                tag.push("attribute_" + sortedAttributes[k]);
            }
            
            if (requestObj.ReqHandlingAlgo === "QUEUE") {
                reqQueueHandler.RemoveRequestFromQueue(logKey, requestObj.QueueId, requestObj.SessionId, function (err, result) {
                    if (err) {
                        console.log(err);
                    }
                });
            }
            redisHandler.RemoveObj_V_T(logKey, key, tag, function (err, result) {
                if (err) {
                    callback(err, "false");
                }
                else {
                    var reqStateKey = util.format('RequestState:%d:%d:%s', company, tenant, sessionId);
                    redisHandler.RemoveObj(logKey, reqStateKey, function () { });
                    callback(null, result);
                }
            });
        }
    });
};

var RejectRequest = function (logKey, company, tenant, sessionId, reason, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start RejectRequest *************************', logKey);

    console.log("reject method hit :: SessionID: " + sessionId + " :: Reason: " + reason);
    var key = util.format('Request:%s:%s:%s', company, tenant, sessionId);
    redisHandler.GetObj(logKey, key, function (err, obj) {
        if (err) {
            callback(err, "false");
        }
        else {
            var requestObj = JSON.parse(obj);
            var stags = ["company_"+company+"", "tenant_"+tenant+ "", "class_"+ requestObj.Class+ "", "type_"+ requestObj.Type+ "", "category_"+ requestObj.Category+ "", "objtype_CSlotInfo", "handlingrequest_"+sessionId+ ""];
            
            redisHandler.SearchObj_T(logKey, stags, function (err, result) {
                if (err) {
                    console.log(err);
                }
                else {
                    if (result.length == 1) {
                        var csObj = result[0];
                        resourceHandler.UpdateSlotStateAvailable(logKey, company, tenant, csObj.Class, csObj.Type, csObj.Category, csObj.ResourceId, csObj.SlotId, "Reject", function (err, reply) {
                            if (err) {
                                console.log(err);
                            }
                        });
                    }
                }
            });

            SetRequestState(logKey, requestObj.Company, requestObj.Tenant, requestObj.SessionId, "QUEUED", function (err, result) {
                if (err) {
                    console.log(err);
                    callback(err, "false");
                }
                else {
                    reqQueueHandler.ReAddRequestToQueue(logKey, requestObj, function (err, result) {
                        if (err) {
                            console.log(err);
                            callback(err, "false");
                        }
                        else if (result == "OK") {
                            console.log("Request Readded to Queue Success");
                            callback(err, "true");
                        }
                        else {
                            console.log("Request Readded to Queue Failed");
                            callback(err, "false");
                        }
                    });
                }
            });
        }
    });
};

var GetRequest = function (logKey, company, tenant, sessionId, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start GetRequest *************************', logKey);

    var key = util.format('Request:%s:%s:%s', company, tenant, sessionId);
    redisHandler.GetObj_V(logKey, key, function (err, obj, vid) {
        infoLogger.DetailLogger.log('info', '%s Finished GetRequest. Result: %s', logKey, obj);
        callback(err, obj, vid);
    });
};

var SearchRequestByTags = function (logKey, tags, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start SearchRequestByTags *************************', logKey);

    if (Array.isArray(tags)) {
        tags.push("objtype_Request");
        redisHandler.SearchObj_V_T(logKey, tags, function (err, result) {
            infoLogger.DetailLogger.log('info', '%s Finished SearchRequestByTags. Result: %s', logKey, result);
            callback(err, result);
        });
    }
    else {
        var e = new Error();
        e.message = "tags must be a string array";
        infoLogger.DetailLogger.log('info', '%s Finished SearchRequestByTags. Result: %s', logKey, "tags must be a string array");
        callback(e, null);
    }
};

var AddProcessingRequest = function (logKey, requestObj, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start AddProcessingRequest *************************', logKey);

    var key = util.format('ProcessingRequest:%d:%d:%s', requestObj.Company, requestObj.Tenant, requestObj.SessionId);
    var tag = ["company_" + requestObj.Company, "tenant_" + requestObj.Tenant, "class_" + requestObj.Class, "type_" + requestObj.Type, "category_" + requestObj.Category, "objtype_ProcessingRequest", "sessionid_" + requestObj.SessionId, "reqserverid_" + requestObj.RequestServerId, "priority_" + requestObj.Priority, "servingalgo_" + requestObj.ServingAlgo, "handlingalgo" + requestObj.HandlingAlgo, "selectionalgo" + requestObj.SelectionAlgo];
    for (var i in requestObj.AttributeInfo) {
        tag.push("attribute_" + requestObj.AttributeInfo[i].AttributeCode);
    }
    var jsonObj = JSON.stringify(requestObj);
    
    redisHandler.AddObj_T(logKey, key, jsonObj, tag, function (err, reply) {
        infoLogger.DetailLogger.log('info', '%s Finished AddProcessingRequest. Result: %s', logKey, reply);
        callback(err, reply);
    });
};

var GetProcessingRequest = function (logKey, company, tenant, sessionId, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start GetProcessingRequest *************************', logKey);

    var key = util.format('ProcessingRequest:%s:%s:%s', company, tenant, sessionId);
    redisHandler.GetObj(logKey, key, function (err, obj) {
        infoLogger.DetailLogger.log('info', '%s Finished GetProcessingRequest. Result: %s', logKey, obj);
        callback(err, obj);
    });
};

var RemoveProcessingRequest = function (logKey, company, tenant, sessionId, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start RemoveProcessingRequest *************************', logKey);

    var key = util.format('ProcessingRequest:%s:%s:%s', company, tenant, sessionId);
    redisHandler.GetObj(logKey, key, function (err, obj) {
        if (err) {
            callback(err, "false");
        }
        else {
            var requestObj = JSON.parse(obj);
            var tag = ["company_" + requestObj.Company, "tenant_" + requestObj.Tenant, "class_" + requestObj.Class, "type_" + requestObj.Type, "category_" + requestObj.Category, "objtype_Request", "sessionid_" + requestObj.SessionId, "reqserverid_" + requestObj.RequestServerId, "priority_" + requestObj.Priority, "servingalgo_" + requestObj.ServingAlgo, "handlingalgo" + requestObj.HandlingAlgo, "selectionalgo" + requestObj.SelectionAlgo];
            for (var i in requestObj.AttributeInfo) {
                tag.push("attribute_" + requestObj.AttributeInfo[i].AttributeCode);
            }
            
            redisHandler.RemoveObj_T(logKey, key, tag, function (err, result) {
                if (err) {
                    callback(err, "false");
                }
                else {
                    callback(null, result);
                }
            });
        }
    });
};

var SearchProcessingRequestByTags = function (logKey, tags, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start SearchProcessingRequestByTags *************************', logKey);

    if (Array.isArray(tags)) {
        tags.push("objtype_ProcessingRequest");
        redisHandler.SearchObj_T(logKey, tags, function (err, result) {
            infoLogger.DetailLogger.log('info', '%s Finished SearchProcessingRequestByTags. Result: %s', logKey, result);
            callback(err, result);
        });
    }
    else {
        var e = new Error();
        e.message = "tags must be a string array";
        infoLogger.DetailLogger.log('info', '%s Finished SearchProcessingRequestByTags. Result: %s', logKey, "tags must be a string array");
        callback(e, null);
    }
};

var SetRequestState = function (logKey, company, tenant, sessionId, state, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start SetRequestState *************************', logKey);

    var key = util.format('RequestState:%d:%d:%s', company, tenant, sessionId);
    redisHandler.SetObj(logKey, key, state, function (err, result) {
        if (err) {
            console.log(err);
        }
        infoLogger.DetailLogger.log('info', '%s Finished SetRequestState. Result: %s', logKey, result);
        callback(err, result);
    });
};

var GetRequestState = function (logKey, company, tenant, sessionId, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start GetRequestState *************************', logKey);
    
    var key = util.format('RequestState:%d:%d:%s', company, tenant, sessionId);
    redisHandler.GetObj(logKey, key, function (err, result) {
        if (err) {
            console.log(err);
        }
        infoLogger.DetailLogger.log('info', '%s Finished GetRequestState. Result: %s', logKey, result);
        callback(err, result);
    });
};

module.exports.AddRequest = AddRequest;
module.exports.SetRequest = SetRequest;
module.exports.RemoveRequest = RemoveRequest;
module.exports.RejectRequest = RejectRequest;
module.exports.GetRequest = GetRequest;
module.exports.SearchRequestByTags = SearchRequestByTags;
module.exports.AddProcessingRequest = AddProcessingRequest;
module.exports.SetRequestState = SetRequestState;
module.exports.GetProcessingRequest = GetProcessingRequest;
module.exports.RemoveProcessingRequest = RemoveProcessingRequest;
module.exports.SearchProcessingRequestByTags = SearchProcessingRequestByTags;
module.exports.GetRequestState = GetRequestState;
