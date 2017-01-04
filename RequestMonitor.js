var util = require('util');
var EventEmitter = require('events').EventEmitter;
var requestHandler = require('dvp-ardscommon/RequestHandler.js');
var dbConn = require('dvp-dbmodels');
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var redisHandler = require('dvp-ardscommon/RedisHandler.js');


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

var FilterObjFromArray = function(itemArray, field, value){
    var resultObj;
    for(var i = 0; i< itemArray.length;i++){
        var item = itemArray[i];
        if(item[field] == value){
            resultObj = item;
            break;
        }
    }
    return resultObj;
};

var GenerateQueueName = function(logKey, queueId, callback){
    redisHandler.GetHashValue(logKey, "QueueNameHash", queueId, function(err, name){
        if(err){
            callback(err, null);
        }else{
            callback(null, name);
        }
    });
};

var SetQueueName = function(summary, callback){
    var qArray =  summary.Queue.split("-");
    var qId = util.format("%s",qArray.join(":"));
    redisHandler.GetHashValue("GetQueueName", "QueueNameHash", qId, function(err, name){
        if(err){
            callback(summary);
        }else{
            if(name) {
                summary.Queue = name;
            }
            callback(summary);
        }
    });
};

var ExtractSummary = function(date, summaries){
    var e = new EventEmitter();
    process.nextTick(function () {
        var count = 0;
        var newSummaries = [];
        for(var i in summaries){
            SetQueueName(summaries[i], function(newSummary){
                count++;
                newSummaries.push(newSummary);
                if(count == summaries.length){
                    e.emit('endSummary', date, newSummaries);
                }
            });
        }
    });

    return (e);
};

var ExtractDailySummary = function(dailySummary, callback){
    //var e = new EventEmitter();
    //process.nextTick(function () {
        var count = 0;
        var newDailySummary = [];
        for(var i in dailySummary){
            var es = ExtractSummary(dailySummary[i].Date, dailySummary[i].Summary);
            es.on('endSummary', function(date ,summary){
                count++;
                newDailySummary.push({Date: date, Summary: summary});
                if(count == dailySummary.length){
                    callback(newDailySummary);
                }
            });
        }
    //});

    //return (e);
};

var GetDailySummaryRecords = function(tenant, company, summaryFromDate, summaryToDate, callback){
    dbConn.SequelizeConn.query("SELECT * FROM \"Dashboard_DailySummaries\" WHERE \"Company\" = '"+company+"' and \"Tenant\" = '"+tenant+"' and \"SummaryDate\"::date >= date '"+summaryFromDate+"' and \"SummaryDate\"::date <= date '"+summaryToDate+"' and \"WindowName\" in (SELECT \"WindowName\"	FROM \"Dashboard_DailySummaries\"	WHERE \"WindowName\" = 'QUEUE' or \"WindowName\" = 'QUEUEDROPPED' or \"WindowName\" = 'QUEUEANSWERED')", { type: dbConn.SequelizeConn.QueryTypes.SELECT})
        .then(function(records) {
            if (records && records.length >0) {
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
                                var sla = ((summary.TotalQueued - queue.ThresholdValue) / summary.TotalQueued) * 100;
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

                ExtractDailySummary(DailySummary, function(dailySummaryWithQueueName){
                    var jsonString = messageFormatter.FormatMessage(undefined, "SUCCESS", true, dailySummaryWithQueueName);
                    callback.end(jsonString);
                });

            }
            else {
                logger.error('[DVP-ARDSMonitoring.GetDailySummaryRecords] - [PGSQL]  - No record found for %s - %s  ', tenant, company);
                var jsonString = messageFormatter.FormatMessage(new Error('No record'), "No records found", false, undefined);
                callback.end(jsonString);
            }
        }).error(function (err) {
            logger.error('[DVP-ARDSMonitoring.GetDailySummaryRecords] - [%s] - [%s] - [PGSQL]  - Error in searching.-[%s]', tenant, company, err);
            var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            callback.end(jsonString);
        });
};

var GetQueueSlaHourlyBreakDownRecords = function(tenant, company, summaryFromDate, callback){
    dbConn.SequelizeConn.query("SELECT t1.\"Param1\" as \"Queue\", t1.\"TotalCount\", t2.\"BreakDown\", t2.\"ThresholdCount\", t2.\"SummaryDate\", t2.\"Hour\", round((t2.\"ThresholdCount\"::numeric/t1.\"TotalCount\"::numeric) *100,2) as \"Average\" FROM \"Dashboard_DailySummaries\" t1, \"Dashboard_ThresholdBreakDowns\" t2 WHERE t1.\"Company\"='"+company+"' AND t1.\"Tenant\"='"+tenant+"' AND t1.\"Param1\"=t2.\"Param1\" AND t1.\"WindowName\"='QUEUE' AND t1.\"SummaryDate\"::date = date '"+summaryFromDate+"' AND t2.\"SummaryDate\"::date = date '"+summaryFromDate+"' ORDER BY t2.\"Hour\", t1.\"Param1\"", { type: dbConn.SequelizeConn.QueryTypes.SELECT})
        .then(function(records) {
            if (records && records.length >0) {
                logger.info('[DVP-ARDSMonitoring.GetQueueSlaHourlyBreakDownRecords] - [%s] - [PGSQL]  - Data found  - %s-[%s]', tenant, company, JSON.stringify(records));
                var count = 0;
                var newSummaries = [];
                for(var i in records){
                    SetQueueName(records[i], function(newSummary){
                        count++;

                        if(newSummary){
                            newSummary.SlaViolated = "True";
                            if(newSummary.BreakDown && newSummary.BreakDown.indexOf("gt") > -1){
                                newSummary.BreakDown = newSummary.BreakDown.replace("-gt", " <");
                            }

                            if(newSummary.BreakDown && newSummary.BreakDown.indexOf("lt") > -1){
                                newSummary.SlaViolated = "False";
                                newSummary.BreakDown = newSummary.BreakDown.replace("lt-", " <");
                            }

                            newSummaries.push(newSummary);
                        }

                        if(count == records.length){
                            var jsonString = messageFormatter.FormatMessage(undefined, "SUCCESS", true, newSummaries);
                            callback.end(jsonString);
                        }
                    });
                }

            }
            else {
                logger.error('[DVP-ARDSMonitoring.GetQueueSlaHourlyBreakDownRecords] - [PGSQL]  - No record found for %s - %s  ', tenant, company);
                var jsonString = messageFormatter.FormatMessage(new Error('No record'), "No records found", false, undefined);
                callback.end(jsonString);
            }
        }).error(function (err) {
            logger.error('[DVP-ARDSMonitoring.GetQueueSlaHourlyBreakDownRecords] - [%s] - [%s] - [PGSQL]  - Error in searching.-[%s]', tenant, company, err);
            var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            callback.end(jsonString);
        });
};

var GetQueueSlaBreakDownRecords = function(tenant, company, summaryFromDate, callback){
    dbConn.SequelizeConn.query("SELECT t1.\"Param1\" as \"Queue\", t1.\"TotalCount\", t2.\"BreakDown\", t2.\"ThresholdCount\", t2.\"SummaryDate\", t2.\"Hour\", round((t2.\"ThresholdCount\"::numeric/t1.\"TotalCount\"::numeric) *100,2) as \"Average\" FROM \"Dashboard_DailySummaries\" t1, \"Dashboard_ThresholdBreakDowns\" t2 WHERE t1.\"Company\"='"+company+"' AND t1.\"Tenant\"='"+tenant+"' AND t1.\"Param1\"=t2.\"Param1\" AND t1.\"WindowName\"='QUEUE' AND t1.\"SummaryDate\"::date = date '"+summaryFromDate+"' AND t2.\"SummaryDate\"::date = date '"+summaryFromDate+"' ORDER BY t2.\"Hour\", t1.\"Param1\"", { type: dbConn.SequelizeConn.QueryTypes.SELECT})
        .then(function(records) {
            if (records && records.length >0) {
                logger.info('[DVP-ARDSMonitoring.GetQueueSlaHourlyBreakDownRecords] - [%s] - [PGSQL]  - Data found  - %s-[%s]', tenant, company, JSON.stringify(records));
                var count = 0;
                var newSummaries = [];
                for(var i in records){
                    SetQueueName(records[i], function(newSummary){
                        count++;

                        if(newSummary) {
                            newSummary.SlaViolated = "True";
                            if (newSummary.BreakDown && newSummary.BreakDown.indexOf("gt") > -1) {
                                newSummary.BreakDown = newSummary.BreakDown.replace("-gt", " <");
                            }

                            if (newSummary.BreakDown && newSummary.BreakDown.indexOf("lt") > -1) {
                                newSummary.SlaViolated = "False";
                                newSummary.BreakDown = newSummary.BreakDown.replace("lt-", " <");
                            }

                            var queue = FilterObjFromArray(newSummaries, 'Queue', newSummary.Queue);
                            if (queue) {
                                var timeRange = FilterObjFromArray(newSummaries, 'BreakDown', newSummary.BreakDown);
                                if (timeRange) {
                                    timeRange.ThresholdCount = timeRange.ThresholdCount + newSummary.ThresholdCount;
                                    timeRange.Average = (timeRange.ThresholdCount / timeRange.TotalCount) * 100;
                                } else {
                                    newSummaries.push(newSummary);
                                }
                            } else {
                                newSummaries.push(newSummary);
                            }
                        }
                        if(count == records.length){
                            var jsonString = messageFormatter.FormatMessage(undefined, "SUCCESS", true, newSummaries);
                            callback.end(jsonString);
                        }
                    });
                }

            }
            else {
                logger.error('[DVP-ARDSMonitoring.GetQueueSlaHourlyBreakDownRecords] - [PGSQL]  - No record found for %s - %s  ', tenant, company);
                var jsonString = messageFormatter.FormatMessage(new Error('No record'), "No records found", false, undefined);
                callback.end(jsonString);
            }
        }).error(function (err) {
            logger.error('[DVP-ARDSMonitoring.GetQueueSlaHourlyBreakDownRecords] - [%s] - [%s] - [PGSQL]  - Error in searching.-[%s]', tenant, company, err);
            var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            callback.end(jsonString);
        });
};

module.exports.GetAllRequests = GetAllRequests;
module.exports.GetRequestFilterByClassTypeCategory = GetRequestFilterByClassTypeCategory;

module.exports.GetAllQueueDetails = GetAllQueueDetails;
module.exports.GetQueueDetailsFilterByClassTypeCategory = GetQueueDetailsFilterByClassTypeCategory;
module.exports.GetDailySummaryRecords = GetDailySummaryRecords;
module.exports.GenerateQueueName = GenerateQueueName;
module.exports.GetQueueSlaHourlyBreakDownRecords = GetQueueSlaHourlyBreakDownRecords;
module.exports.GetQueueSlaBreakDownRecords = GetQueueSlaBreakDownRecords;