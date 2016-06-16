var util = require('util');
var EventEmiter = require('events').EventEmitter;
var requestHandler = require('dvp-ardscommon/RequestHandler.js');
var dbConn = require('dvp-dbmodels');
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var request = require('request');

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

var GetRequestFilterByClassTypeCategory = function (logkey, company, tenant, reqServer, reqType, callback) {
    var searchTags = ["company_" + company, "tenant_" + tenant, "serverType_" + reqServer, "requestType_" + reqType];
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
                    if (o.Status == "QUEUED" || o.Status =="TRYING") {
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

var GetQueueDetailsFilterByClassTypeCategory = function (logkey, company, tenant, reqServer, reqType, callback) {
    var searchTags = ["company_" + company, "tenant_" + tenant, "serverType_" + reqServer, "requestType_" + reqType];
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

function FilterObjFromArray(itemArray, field, value){
    var resultObj;
    for(var i in itemArray){
        var item = itemArray[i];
        if(item[field] == value){
            resultObj = item;
            break;
        }
    }
    return resultObj;
}

var GetDailySummaryRecords = function(tenant, company, summaryFromDate, summaryToDate, callback){
    dbConn.SequelizeConn.query("SELECT * FROM \"Dashboard_DailySummaries\" WHERE \"Company\" = '"+company+"' and \"Tenant\" = '"+tenant+"' and \"SummaryDate\"::date >= date '"+summaryFromDate+"' and \"SummaryDate\"::date <= date '"+summaryToDate+"' and \"WindowName\" in (SELECT \"WindowName\"	FROM \"Dashboard_DailySummaries\"	WHERE \"WindowName\" = 'QUEUE' or \"WindowName\" = 'QUEUEDROPPED' or \"WindowName\" = 'QUEUEANSWERED')", { type: dbConn.SequelizeConn.QueryTypes.SELECT})
        .then(function(records) {
            if (records) {
                logger.info('[DVP-ARDSMonitoring.GetDailySummaryRecords] - [%s] - [PGSQL]  - Data found  - %s-[%s]', tenant, company, JSON.stringify(records));
                var Queues = [];
                for(var i in records){
                    var record = records[i];
                    var queueDateInfo = FilterObjFromArray(Queues, "queueDate", record.SummaryDate.toDateString());
                    if(!queueDateInfo){
                        queueDateInfo = {queueDate:record.SummaryDate.toDateString(), queueInfos:[]};
                        Queues.push(queueDateInfo);
                    }
                    var queueInfo = FilterObjFromArray(queueDateInfo.queueInfos, "queueId", record.Param1);
                    if (queueInfo) {
                        queueInfo.records.push(record);
                    } else {
                        queueDateInfo.queueInfos.push({queueId: record.Param1, records: [record]});
                    }
                }
                var DailySummary = [];
                for(var t in Queues) {
                    var date = Queues[t];

                    for (var j in date.queueInfos) {
                        var reqQueue = date.queueInfos[j];

                        var queue = FilterObjFromArray(reqQueue.records, "WindowName", "QUEUE");
                        var queueAnswered = FilterObjFromArray(reqQueue.records, "WindowName", "QUEUEANSWERED");
                        var queueDropped = FilterObjFromArray(reqQueue.records, "WindowName", "QUEUEDROPPED");

                        var summary = {};
                        if (queue) {
                            var summaryDate = FilterObjFromArray(DailySummary, "Date", queue.SummaryDate.toDateString());
                            if(!summaryDate){
                                summaryDate = {Date: queue.SummaryDate.toDateString(), Summary: []};
                                DailySummary.push(summaryDate);
                            }
                            summary.Queue = queue.Param1;
                            summary.Date = queue.SummaryDate;
                            summary.TotalQueued = queue.TotalCount;
                            summary.TotalQueueTime = queue.TotalTime;
                            summary.MaxTime = queue.MaxTime;
                            summary.QueueAnswered = 0;
                            summary.QueueDropped = 0;
                            if (summary.TotalQueued > 0) {
                                summary.AverageQueueTime = summary.TotalQueueTime / summary.TotalQueued;
                                var sla = ((summary.TotalQueued - summary.Threshold) / summary.TotalQueued) * 100;
                                summary.SLA = sla;
                            }
                            if (queueAnswered) {
                                summary.QueueAnswered = queueAnswered.TotalCount;
                            }
                            if (queueDropped) {
                                summary.QueueDropped = queueDropped.TotalCount;
                            }

                            summaryDate.Summary.push(summary);
                        }
                    }
                }

                var jsonString = messageFormatter.FormatMessage(undefined, "SUCCESS", true, DailySummary);

                callback.end(jsonString);
            }
            else {
                logger.error('[DVP-ARDSMonitoring.GetDailySummaryRecords] - [PGSQL]  - No record found for %s - %s  ', tenant, company);
                var jsonString = messageFormatter.FormatMessage(new Error('No record'), "EXCEPTION", false, undefined);
                callback.end(jsonString);
            }
        }).error(function (err) {
            logger.error('[DVP-ARDSMonitoring.GetDailySummaryRecords] - [%s] - [%s] - [PGSQL]  - Error in searching.-[%s]', tenant, company, err);
            var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            callback.end(jsonString);
        });
};

module.exports.GetAllRequests = GetAllRequests;
module.exports.GetRequestFilterByClassTypeCategory = GetRequestFilterByClassTypeCategory;

module.exports.GetAllQueueDetails = GetAllQueueDetails;
module.exports.GetQueueDetailsFilterByClassTypeCategory = GetQueueDetailsFilterByClassTypeCategory;
module.exports.GetDailySummaryRecords = GetDailySummaryRecords;