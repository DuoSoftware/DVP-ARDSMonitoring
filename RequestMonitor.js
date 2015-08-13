var util = require('util');
var EventEmiter = require('events').EventEmitter;
var requestHandler = require('ArdsCommon/RequestHandler.js');

var SplitAndGetStatus = function (logKey, requestlist) {
    var e = new EventEmiter();
    process.nextTick(function () {
        var count = 0;
        var reqlistCount = requestlist.length;
        for (var i in requestlist) {
            var val = requestlist[i];
            console.log("    " + i + ": " + val);
            
            var requestObj = val.Obj;
            var requestVid = val.Vid;
            requestHandler.GetRequestState(logKey, requestObj.Company, requestObj.Tenant, requestObj.SessionId, function (err, reqstate) {
                if (err) {
                    console.log(err);
                }
                e.emit('result', requestlist[count].Obj, requestlist[count].Vid, reqstate);
                count++;

                if (reqlistCount === count) {
                    console.log("end", count);
                    e.emit('end');
                }
            });
        }
    });
    return (e);
};

var SearchRequestByTags = function (logkey, searchTags, callback) {
    requestHandler.SearchRequestByTags(logkey, searchTags, function (err, requestlist) {
        if (err) {
            console.log(err);
            callback(err, []);
        }
        else {
            var returnlist = [];
            if (requestlist.length > 0) {
                var gobtk = SplitAndGetStatus(logkey, requestlist);
                
                gobtk.on('result', function (requestObj, requestVid, reqstate) {
                    var obj = { Request: requestObj, Status: reqstate, Vid: requestVid };
                    returnlist.push(obj);
                });
                
                gobtk.on('end', function () {
                    callback(null, returnlist);
                });
            }
            else {
                callback(null, returnlist);
            }
        }
    });
};

var GetAllRequests = function (logkey, company, tenant, callback) {
    var searchTags = ["company_" + company, "tenant_" + tenant];
    SearchRequestByTags(logkey, searchTags, function (err, returnlist) {
        callback(err, returnlist);
    });
};

var GetRequestFilterByClassTypeCategory = function (logkey, company, tenant, reqclass, reqtype, reqcategory, callback) {
    var searchTags = ["company_" + company, "tenant_" + tenant, "class_" + reqclass, "type_" + reqtype, "category_" + reqcategory];
    SearchRequestByTags(logkey, searchTags, function (err, returnlist) {
        callback(err, returnlist);
    });
};

var GetAllQueueDetails = function (logkey, company, tenant, callback) {
    GetAllRequests(logkey, company, tenant, function (err, requestlist) {
        var returnlist = [];
        if (err) {
            console.log(err);
        }
        else {
            if (requestlist.length > 0) {
                requestlist.reduce(function (result, o) {
                    if (o.Status == "QUEUED") {
                        var unit = o.Request.QueueId;
                        if (!(unit in returnlist)) {
                            returnlist.push(returnlist[unit] = {
                                Queue: o.Request.QueueId, 
                                Items: [o]
                            });
                        } else {
                            returnlist[unit].Items.push(o);
                        }
                    }
                    
                    return result;
                }, { arr: [] }).arr;
            }
        }

        callback(err, returnlist);
    });
};

var GetQueueDetailsFilterByClassTypeCategory = function (logkey, company, tenant, reqclass, reqtype, reqcategory, callback) {
    var searchTags = ["company_" + company, "tenant_" + tenant, "class_" + reqclass, "type_" + reqtype, "category_" + reqcategory];
    SearchRequestByTags(logkey, searchTags, function (err, requestlist) {
        var returnlist = [];
        if (err) {
            console.log(err);
        }
        else {
            if (requestlist.length > 0) {
                requestlist.reduce(function (result, o) {
                    if (o.Status == "QUEUED") {
                        var unit = o.Request.QueueId;
                        if (!(unit in returnlist)) {
                            returnlist.push(returnlist[unit] = {
                                Queue: o.Request.QueueId, 
                                Items: [o]
                            });
                        } else {
                            returnlist[unit].Items.push(o);
                        }
                    }
                    
                    return result;
                }, { arr: [] }).arr;
            }
        }
        
        callback(err, returnlist);
    });
};

module.exports.GetAllRequests = GetAllRequests;
module.exports.GetRequestFilterByClassTypeCategory = GetRequestFilterByClassTypeCategory;

module.exports.GetAllQueueDetails = GetAllQueueDetails;
module.exports.GetQueueDetailsFilterByClassTypeCategory = GetQueueDetailsFilterByClassTypeCategory;