var util = require('util');
var redisHandler = require('./RedisHandler.js');
var restClientHandler = require('./RestClient.js');
var reqQueueHandler = require('./ReqQueueHandler.js');
var url = require("url");
var infoLogger = require('./InformationLogger.js');

var AddRequestServer = function (logKey, reqServerObj, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start AddRequestServer *************************', logKey);

    var key = util.format('ReqServer:%d:%d:%s', reqServerObj.Company, reqServerObj.Tenant, reqServerObj.ServerID);
    var tag = ["company_" + reqServerObj.Company, "tenant_" + reqServerObj.Tenant, "class_" + reqServerObj.Class, "type_" + reqServerObj.Type, "category_" + reqServerObj.Category, "objtype_ReqServer", "serverid_" + reqServerObj.ServerID];
    
    var obj = JSON.stringify(reqServerObj);
    
    redisHandler.AddObj_T(logKey, key, obj, tag, function (err, result) {
        infoLogger.DetailLogger.log('info', '%s Finished AddRequestServer. Result: %s', logKey, result);
        callback(err, result);
    });
};

var SetRequestServer = function (logKey, reqServerObj, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start SetRequestServer *************************', logKey);

    var key = util.format('ReqServer:%d:%d:%d', reqServerObj.Company, reqServerObj.Tenant, reqServerObj.ServerID);
    var tag = ["company_" + reqServerObj.Company, "tenant_" + reqServerObj.Tenant, "class_" + reqServerObj.Class, "type_" + reqServerObj.Type, "category_" + reqServerObj.Category, "objtype_ReqServer", "serverid_" + reqServerObj.ServerID];
    
    var obj = JSON.stringify(reqServerObj);
    
    redisHandler.SetObj_T(logKey, key, obj, tag, function (err, result) {
        infoLogger.DetailLogger.log('info', '%s Finished SetRequestServer. Result: %s', logKey, result);
        callback(err, result);
    });
};

var GetRequestServer = function (logKey, company, tenant, serverId, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start GetRequestServer *************************', logKey);

    var key = util.format('ReqServer:%s:%s:%s', company, tenant, serverId);
    redisHandler.GetObj(logKey, key, function (err, result) {
        infoLogger.DetailLogger.log('info', '%s Finished GetRequestServer. Result: %s', logKey, result);
        callback(err, result);
    });
};

var SearchReqServerByTags = function (logKey, tags, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start SearchReqServerByTags *************************', logKey);

    if (Array.isArray(tags)) {
        tags.push("objtype_ReqServer");
        redisHandler.SearchObj_T(logKey, tags, function (err, result) {
            infoLogger.DetailLogger.log('info', '%s Finished SearchReqServerByTags. Result: %s', logKey, result);
            callback(err, result);
        });
    }
    else {
        var e = new Error();
        e.message = "tags must be a string array";
        infoLogger.DetailLogger.log('info', '%s Finished SearchReqServerByTags. Result: tags must be a string array', logKey);
        callback(e, null);
    }
};

var RemoveRequestServer = function (logKey, company, tenant, serverId, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start RemoveRequestServer *************************', logKey);

    var key = util.format('ReqServer:%s:%s:%s', company, tenant, serverId);
    
    redisHandler.GetObj(logKey, key, function (err, obj) {
        if (err) {
            callback(err, "false");
        }
        else {
            var reqServerObj = JSON.parse(obj);
            if (reqServerObj == null) {
                var res = util.format('ReqServer %s does not exists!', serverId);
                infoLogger.DetailLogger.log('info', '%s Finished RemoveRequestServer. Result: %s', logKey, res);
                callback(err, res);
            }
            else {
                var tag = ["company_" + reqServerObj.Company, "tenant_" + reqServerObj.Tenant, "class_" + reqServerObj.Class, "type_" + reqServerObj.Type, "category_" + reqServerObj.Category, "objtype_ReqServer", "serverid_" + reqServerObj.ServerID];
                
                redisHandler.RemoveObj_T(logKey, key, tag, function (err, result) {
                    infoLogger.DetailLogger.log('info', '%s Finished RemoveRequestServer. Result: %s', logKey, result);
                    callback(err, result);
                });
            }
        }
    });
};

var SendCallBack = function (logKey, serverurl, resultToSend, callback) {
    infoLogger.DetailLogger.log('info', '%s +++++++++++++++++++++++++ Start SendCallBack Server +++++++++++++++++++++++++', logKey);
    infoLogger.DetailLogger.log('info', '%s SendCallBack Server Url: %s :: ResultToSend: %s', logKey, serverurl, resultToSend);

    //var surl = util.format('%s//%s', url.parse(serverurl).protocol, url.parse(serverurl).host);
    restClientHandler.DoPostDirect(serverurl, resultToSend, function (err, res, result) {
        if (err) {
            infoLogger.DetailLogger.log('error', '%s Finished SendCallBack. Error: %s', logKey, err);
            console.log(err);
            callback(false, "error");
        }
        else {
            if (res.statusCode == "503") {
                infoLogger.DetailLogger.log('info', '%s Finished SendCallBack. Result: %s', logKey, "readdRequired");
                console.log(result);
                callback(true, "readdRequired");
            }
            else if (res.statusCode == "200") {
                infoLogger.DetailLogger.log('info', '%s Finished SendCallBack. Result: %s', logKey, "setNext");
                callback(true, "setNext");
            }
            else {
                infoLogger.DetailLogger.log('info', '%s Finished SendCallBack. Result: %s', logKey, "error");
                callback(false, "error");
            }
        }
    });
};

module.exports.AddRequestServer = AddRequestServer;
module.exports.SetRequestServer = SetRequestServer;
module.exports.GetRequestServer = GetRequestServer;
module.exports.SearchReqServerByTags = SearchReqServerByTags;
module.exports.RemoveRequestServer = RemoveRequestServer;
module.exports.SendCallBack = SendCallBack;