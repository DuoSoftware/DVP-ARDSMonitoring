var redisHandler = require('./RedisHandler.js');
var reqServerHandler = require('./ReqServerHandler.js');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var sort = require('./SortArray.js');
var infoLogger = require('./InformationLogger.js');
var reqMetaDataHandler = require('./ReqMetaDataHandler.js');

var execute = function (logKey, data, callback) {
    infoLogger.DetailLogger.log('info', '%s +++++++++++++++++++++++++ Start PreProcessor +++++++++++++++++++++++++', logKey);

    var srs = SetRequestServer(logKey, data);
    var key = util.format('ReqMETA:%d:%d:%s:%s:%s', data.Company, data.Tenant, data.Class, data.Type, data.Category);
    var date = new Date();
    
    srs.on('server', function (url) {
        redisHandler.GetObj(logKey, key, function (err, result) {
            if (err) {
                result = reqMetaDataHandler.ReloadMetaData(data.Company, data.Tenant, data.Class, data.Type, data.Category);
            }
            else if (result == null) {
                result = reqMetaDataHandler.ReloadMetaData(data.Company, data.Tenant, data.Class, data.Type, data.Category);
            }
            else {
                if (result = null) {
                    callback(null, null);
                } else {
                    var metaObj = JSON.parse(result);
                    
                    var attributeInfo = [];
                    var sortedAttributes = sort.sortData(data.Attributes);
                    for (var i in sortedAttributes) {
                        var val = sortedAttributes[i];
                        
                        attributeInfo = AppendAttributeInfo(attributeInfo, metaObj.AttributeMeta, val);
                    //for (var j in metaObj.AttributeMeta) {
                    //    var val1 = metaObj.AttributeMeta[j].AttributeCode;
                    //    if (val1.indexOf(val) == 1) {
                    //        attributeInfo.push(metaObj.AttributeMeta[j]);
                    //    }
                    //}
                    }
                    
                    var attributeDataString = util.format('attribute_%s', sortedAttributes.join(":attribute_"));
                    var queueId = util.format('Queue:%d:%d:%s:%s:%s:%s:%s', data.Company, data.Tenant, data.Class, data.Type, data.Category, attributeDataString, data.Priority.toUpperCase());
                    var date = new Date();
                    var requestObj = { Company: data.Company, Tenant: data.Tenant, Class: data.Class, Type: data.Type, Category: data.Category, SessionId: data.SessionId, AttributeInfo: attributeInfo, RequestServerId: data.RequestServerId, Priority: data.Priority.toUpperCase(), ArriveTime: date.toISOString(), OtherInfo: data.OtherInfo, ServingAlgo: metaObj.ServingAlgo, HandlingAlgo: metaObj.HandlingAlgo, SelectionAlgo: metaObj.SelectionAlgo, RequestServerUrl: url, QueueId: queueId, ReqHandlingAlgo: metaObj.ReqHandlingAlgo, ReqSelectionAlgo: metaObj.ReqSelectionAlgo };
                    infoLogger.DetailLogger.log('info', '%s PreProcessor Request Queue Id: %s', logKey, queueId);
                    infoLogger.DetailLogger.log('info', '%s Finished PreProcessor. Result: %s', logKey, requestObj);
                    callback(null, requestObj);
                }
            }
        });
    
    });
};

var AppendAttributeInfo = function (attInfo, attMetaData, att) {
    for (var i in attInfo) {
        var info = attInfo[i];
        for (var j in attMetaData) {
            var attMeta = attMetaData[j];
            if (attMeta.AttributeCode.indexOf(att) >= 0) {
                if (info.AttributeClass == attMeta.AttributeClass && info.AttributeType == attMeta.AttributeType && info.AttributeCategory == attMeta.AttributeCategory) {
                    info.AttributeCode.push(att);
                    return attInfo;
                }
                else {
                    var tempObj = { AttributeClass: attMeta.AttributeClass, AttributeType: attMeta.AttributeType, AttributeCategory: attMeta.AttributeCategory, AttributeCode: [att], WeightPrecentage: attMeta.WeightPrecentage };
                    attInfo.push(tempObj);
                    return attInfo;
                }
            }
            else {
                return attInfo;
            }
        }
    }

    for (var j in attMetaData) {
        var attMeta = attMetaData[j];
        if (attMeta.AttributeCode.indexOf(att) >= 0) {
            var tempObj = { AttributeClass: attMeta.AttributeClass, AttributeType: attMeta.AttributeType, AttributeCategory: attMeta.AttributeCategory, AttributeCode: [att], WeightPrecentage: attMeta.WeightPrecentage };
            attInfo.push(tempObj);
            return attInfo;
        }
        else {
            return attInfo;
        }
    }


};

var SetRequestServer = function (logKey, data) {
    var e = new EventEmitter();
    process.nextTick(function () {
        if (data.RequestServerId == "0") {
            var tags = ["company_"+data.Company, "tenant_" + data.Tenant, "class_" + data.Class, "type_" + data.Type, "category_" + data.Category];
            reqServerHandler.SearchReqServerByTags(logKey, tags, function (err, result) {
                if (err) {
                    e.emit('server', "");
                }
                else {
                    var randServer = result[Math.floor(Math.random() * result.length)];
                    e.emit('server', randServer.CallbackUrl);
                }
            });
        }
        else {
            reqServerHandler.GetRequestServer(logKey, data.Company, data.Tenant, data.RequestServerId, function (err, reqServerResult) {
                if (err) {
                    e.emit('server', "");
                }
                else {
                    var cUrl = JSON.parse(reqServerResult).CallbackUrl;
                    e.emit('server', cUrl);
                }
            });
        }
    });
    
    return (e);
};

module.exports.execute = execute;