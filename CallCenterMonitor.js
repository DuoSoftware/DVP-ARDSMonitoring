/**
 * Created by Heshan.i on 3/24/2017.
 */


var dbConn = require('dvp-dbmodels');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var Q = require('q');
var async = require('async');
var moment = require('moment');
var json2csv = require('json2csv');
var fs = require('fs');
var fileService = require('./Services/fileService');
var util = require('util');

var TimeFormatter = function (seconds) {

    var timeStr = '0:0:0';
    if(seconds > 0) {
        var durationObj = moment.duration(seconds * 1000);

        if (durationObj) {
            var tempHrs = 0;
            if (durationObj._data.years > 0) {
                tempHrs = tempHrs + durationObj._data.years * 365 * 24;
            }
            if (durationObj._data.months > 0) {
                tempHrs = tempHrs + durationObj._data.months * 30 * 24;
            }
            if (durationObj._data.days > 0) {
                tempHrs = tempHrs + durationObj._data.days * 24;
            }

            tempHrs = tempHrs + durationObj._data.hours;
            timeStr = tempHrs + ':' + durationObj._data.minutes + ':' + durationObj._data.seconds;
        }
    }
    return timeStr;
};

// Load data from pgsql database
var LoadCallCenterPerformanceData = function(tenant, company, startTime, endTime,businessUnit){
    var deferred = Q.defer();

    try
    {

        var callCenterPerformanceQuery = {
            where : [{Company: company, Tenant: tenant, WindowName: {$in:['CALLS', 'QUEUE', 'QUEUEANSWERED', 'CONNECTED', 'QUEUEDROPPED', 'LOGIN', 'AFTERWORK', 'BREAK', 'AGENTHOLD']}, SummaryDate: {between:[startTime, endTime]}}]
        };

        if(businessUnit && businessUnit!=="*"){
            callCenterPerformanceQuery.where.push({'BusinessUnit':businessUnit})
        }
        dbConn.DashboardDailySummary.findAll(callCenterPerformanceQuery).then(function(performanceData)
        {
            deferred.resolve(performanceData);
        }).catch(function(err)
        {
            deferred.reject(err);
        });

    }
    catch(ex)
    {
        deferred.reject(ex);
    }

    return deferred.promise;
};

// data processing functions
var ProcessCalls = function(performanceData){
    var deferred = Q.defer();

    try{

        var result = {
            TotalInboundCallCount: 0,
            TotalOutboundCallCount: 0
        };

        var callData = performanceData.filter(function (pData) {
            return pData.WindowName === "CALLS";
        });

        callData.forEach(function (calls) {
            if(calls.Param1 === "inbound"){
                result.TotalInboundCallCount = result.TotalInboundCallCount + calls.TotalCount;
            }else{
                result.TotalOutboundCallCount = result.TotalOutboundCallCount + calls.TotalCount;
            }
        });

        deferred.resolve(result);

    }catch(ex){
        deferred.reject(ex);
    }

    return deferred.promise;
};

var ProcessQueues = function(performanceData){
    var deferred = Q.defer();

    try{

        var result = {
            TotalQueued: 0
        };

        var queueData = performanceData.filter(function (pData) {
            return pData.WindowName === "QUEUE";
        });

        queueData.forEach(function (queue) {
            result.TotalQueued = result.TotalQueued + queue.TotalCount;
        });

        deferred.resolve(result);

    }catch(ex){
        deferred.reject(ex);
    }

    return deferred.promise;
};

var ProcessQueueAnswer = function(performanceData){
    var deferred = Q.defer();

    try{

        var result = {
            TotalQueueAnswered: 0
        };

        var queueData = performanceData.filter(function (pData) {
            return pData.WindowName === "QUEUEANSWERED";
        });

        queueData.forEach(function (queue) {
            result.TotalQueueAnswered = result.TotalQueueAnswered + queue.TotalCount;
        });

        deferred.resolve(result);

    }catch(ex){
        deferred.reject(ex);
    }

    return deferred.promise;
};

var ProcessAnswer = function(performanceData){
    var deferred = Q.defer();

    try{

        var result = {
            TotalInboundAgentCount: 0,
            TotalOutboundAgentCount: 0,
            TotalInboundAnswerCount: 0,
            TotalOutboundAnswerCount: 0,
            TotalInboundAnswerTime: 0,
            TotalOutboundAnswerTime: 0
        };

        var answerData = performanceData.filter(function (pData) {
            return pData.WindowName === "CONNECTED";
        });

        answerData.forEach(function (answer) {

            if(answer.Param2 === "CALLinbound"){
                result.TotalInboundAnswerCount = result.TotalInboundAnswerCount + answer.TotalCount;
                result.TotalInboundAgentCount = result.TotalInboundAgentCount + 1;
                result.TotalInboundAnswerTime = result.TotalInboundAnswerTime + answer.TotalTime;
            }else{
                result.TotalOutboundAnswerCount = result.TotalOutboundAnswerCount + answer.TotalCount;
                result.TotalOutboundAgentCount = result.TotalOutboundAgentCount + 1;
                result.TotalOutboundAnswerTime = result.TotalOutboundAnswerTime + answer.TotalTime;
            }
        });

        deferred.resolve(result);

    }catch(ex){
        deferred.reject(ex);
    }

    return deferred.promise;
};

var ProcessDropped = function(performanceData){
    var deferred = Q.defer();

    try{

        var result = {
            TotalDropped: 0
        };

        var droppedData = performanceData.filter(function (pData) {
            return pData.WindowName === "QUEUEDROPPED";
        });

        droppedData.forEach(function (dropped) {
            result.TotalDropped = result.TotalDropped + dropped.TotalCount;
        });

        deferred.resolve(result);

    }catch(ex){
        deferred.reject(ex);
    }

    return deferred.promise;
};

var ProcessLogin = function(performanceData){
    var deferred = Q.defer();

    try{

        var result = {
            TotalStaffCount: 0,
            TotalStaffTime: 0
        };

        var loginData = performanceData.filter(function (pData) {
            return pData.WindowName === "LOGIN";
        });

        loginData.forEach(function (login) {
            result.TotalStaffCount = result.TotalStaffCount + 1;
            result.TotalStaffTime = result.TotalStaffTime + login.TotalTime;
        });

        deferred.resolve(result);

    }catch(ex){
        deferred.reject(ex);
    }

    return deferred.promise;
};

var ProcessAfterWork = function(performanceData){
    var deferred = Q.defer();

    try{

        var result = {
            TotalAcwTime: 0
        };

        var acwData = performanceData.filter(function (pData) {
            return pData.WindowName === "AFTERWORK";
        });

        acwData.forEach(function (acw) {
            result.TotalAcwTime = result.TotalAcwTime + acw.TotalTime;
        });

        deferred.resolve(result);

    }catch(ex){
        deferred.reject(ex);
    }

    return deferred.promise;
};

var ProcessBreak = function(performanceData){
    var deferred = Q.defer();

    try{

        var result = {
            TotalBreakTime: 0
        };

        var acwData = performanceData.filter(function (pData) {
            return pData.WindowName === "BREAK";
        });

        acwData.forEach(function (acw) {
            result.TotalBreakTime = result.TotalBreakTime + acw.TotalTime;
        });

        deferred.resolve(result);

    }catch(ex){
        deferred.reject(ex);
    }

    return deferred.promise;
};

var ProcessHold = function(performanceData){
    var deferred = Q.defer();

    try{

        var result = {
            TotalHoldTime: 0
        };

        var acwData = performanceData.filter(function (pData) {
            return pData.WindowName === "AGENTHOLD";
        });

        acwData.forEach(function (acw) {
            result.TotalHoldTime = result.TotalHoldTime + acw.TotalTime;
        });

        deferred.resolve(result);

    }catch(ex){
        deferred.reject(ex);
    }

    return deferred.promise;
};

// Calculate performance summary for one date
var GetSingleDateSummary = function (filterDataForDate, summaryDate) {

    var deferred = Q.defer();

    var asyncTasks = [
        ProcessCalls(filterDataForDate),
        ProcessQueues(filterDataForDate),
        ProcessAnswer(filterDataForDate),
        ProcessDropped(filterDataForDate),
        ProcessLogin(filterDataForDate),
        ProcessAfterWork(filterDataForDate),
        ProcessQueueAnswer(filterDataForDate),
        ProcessBreak(filterDataForDate),
        ProcessHold(filterDataForDate)
    ];

    Q.all(asyncTasks).then(function (results) {
        var callCenterPerformance = {
            Date:summaryDate,
            totalInbound: results[0].TotalInboundCallCount,
            totalOutbound: results[0].TotalOutboundCallCount,
            totalQueued: results[1].TotalQueued,
            totalQueueAnswered: results[6].TotalQueueAnswered,
            totalQueueDropped: results[3].TotalDropped,
            totalStaffTime: results[4].TotalStaffTime,
            totalAcwTime: results[5].TotalAcwTime,
            AverageStaffTime: results[4].TotalStaffCount?(results[4].TotalStaffTime / results[4].TotalStaffCount).toFixed(2): 0,
            AverageAcwTime: results[4].TotalStaffCount?(results[5].TotalAcwTime / results[4].TotalStaffCount).toFixed(2): 0,
            AverageInboundCallsPerAgent: results[2].TotalInboundAgentCount?(results[2].TotalInboundAnswerCount/ results[2].TotalInboundAgentCount).toFixed(2): 0,
            AverageOutboundCallsPerAgent: results[2].TotalOutboundAgentCount?(results[0].TotalOutboundCallCount / results[2].TotalOutboundAgentCount).toFixed(2): 0,
            TotalStaffCount: results[4].TotalStaffCount,


            totalTalkTimeInbound: results[2].TotalInboundAnswerTime,
            totalTalkTimeOutbound: results[2].TotalOutboundAnswerTime,
            totalBreakTime: results[7].TotalBreakTime,
            totalHoldTime: results[8].TotalHoldTime,
            totalIdleTime: results[4].TotalStaffTime - (results[5].TotalAcwTime + results[2].TotalInboundAnswerTime + results[2].TotalOutboundAnswerTime + results[7].TotalBreakTime + results[8].TotalHoldTime),
            AverageTalkTimeInbound: results[0].TotalInboundCallCount? (results[2].TotalInboundAnswerTime / results[0].TotalInboundCallCount).toFixed(2): 0,
            AverageTalkTimeOutbound: results[0].TotalOutboundCallCount? (results[2].TotalOutboundAnswerTime / results[0].TotalOutboundCallCount).toFixed(2): 0
        };

        deferred.resolve(callCenterPerformance);
        //callCenterPerformanceSummary.push({Date:m_startTime, SummaryDate: callCenterPerformance})
        //callback(undefined, callCenterPerformance);
    }).catch(function(err) {
        deferred.resolve({Date:summaryDate, SummaryData: undefined});
    });

    return deferred.promise;

};

// Initiate performance calculation
var GetCallCenterPerformance = function (tenant, company, req, callback) {
    var startTime = req.params.summaryFromDate;
    var endTime = req.params.summaryToDate;
    var businessUnit = req.params.businessUnit ;

    /*var callCenterPerformance = {
        totalInbound: 0,
        totalOutbound: 0,
        totalQueued: 0,
        totalQueueAnswered: 0,
        totalQueueDropped: 0,
        totalStaffTime: 0,
        totalAcwTime: 0,
        AverageStaffTime: 0,
        AverageAcwTime: 0,
        AverageInboundCallsPerAgent: 0,
        AverageOutboundCallsPerAgent: 0,
        TotalStaffCount: 0,

        totalTalkTimeInbound: 0,
        totalTalkTimeOutbound: 0,
        totalBreakTime: 0,
        totalIdleTime: 0,
        totalHoldTime: 0,
        AverageTalkTimeInbound: 0,
        AverageTalkTimeOutbound: 0
    };*/


    LoadCallCenterPerformanceData(tenant, company, startTime, endTime,businessUnit).then(function(performanceData){

        var summaryTasks = [];
        var m_endTime = moment(endTime);
        for (var m_startTime = moment(startTime); m_startTime.isBefore(m_endTime); m_startTime.add(1, 'days')) {
            var filterDate = m_startTime.format('YYYY-MM-DD');
            console.log(filterDate);

            var filterDataForDate = performanceData.filter(function (data) {
                return filterDate === moment(data.SummaryDate).format('YYYY-MM-DD');
            });

            summaryTasks.push(GetSingleDateSummary(filterDataForDate, filterDate));
        }


        Q.all(summaryTasks).then(function (results) {
            callback(undefined, results);
        }).catch(function(err) {
            callback(err, undefined);
        });


    }).catch(function(err) {

        callback(err, undefined);
    });

};

var FileCheckAndDelete = function(company, tenant, filename) {
    var deferred = Q.defer();

    fileService.GetFileMetadata(company, tenant, filename, function(err, fileData){
        if(fileData && fileData.Result){
            fileService.DeleteFile(company, tenant, fileData.Result.UniqueId, function (err, delResp){
                if (err){
                    deferred.reject(err);

                }
                else{
                    deferred.resolve(true);
                }

            });
        }
        else{
            if(err){
                deferred.reject(err);
            }
            else{
                deferred.resolve(true);
            }
        }
    });

    return deferred.promise;
};


var PrepareForDownloadCallCenterPerformance = function(tenant, company, req, res) {
    var jsonString;
    try
    {
        var startTime = req.params.summaryFromDate;
        var endTime = req.params.summaryToDate;
        var businessUnit = req.params.businessUnit ;

        var fileName = util.format('CallCenterPerformanceReport_%s_%s_%s.csv', startTime, endTime,businessUnit);

        FileCheckAndDelete(company, tenant, fileName).then(function(chkResult) {
            if(chkResult) {

                var reqBody = {class: 'MISSEDCALL', fileCategory:'REPORTS', display: fileName, filename: fileName};

                fileService.FileUploadReserve(company, tenant, fileName, reqBody, function(err, fileResResp)
                {
                    if (err) {
                        jsonString = messageFormatter.FormatMessage(err, "ERROR", false, null);
                        logger.debug('[DVP-ArdsMonitor.DownloadCallCenterPerformance] - API RESPONSE : %s', jsonString);
                        res.end(jsonString);
                    } else {
                        if(fileResResp) {
                            var uniqueId = fileResResp.Result;

                            //should respose end
                            jsonString = messageFormatter.FormatMessage(null, "SUCCESS", true, fileName);
                            logger.debug('[DVP-ArdsMonitor.DownloadCallCenterPerformance] - API RESPONSE : %s', jsonString);
                            res.end(jsonString);




                            LoadCallCenterPerformanceData(tenant, company, startTime, endTime,businessUnit).then(function(performanceData){

                                var summaryTasks = [];
                                var m_endTime = moment(endTime);
                                for (var m_startTime = moment(startTime); m_startTime.isBefore(m_endTime); m_startTime.add(1, 'days')) {
                                    var filterDate = m_startTime.format('YYYY-MM-DD');
                                    console.log(filterDate);

                                    var filterDataForDate = performanceData.filter(function (data) {
                                        return filterDate === moment(data.SummaryDate).format('YYYY-MM-DD');
                                    });

                                    summaryTasks.push(GetSingleDateSummary(filterDataForDate, filterDate));
                                }


                                Q.all(summaryTasks).then(function (results) {
                                    var tagOrder = ['Date', 'totalInbound', 'totalOutbound', 'totalQueued', 'totalQueueAnswered', 'totalQueueDropped', 'TotalStaffCount', 'AverageInboundCallsPerAgent', 'AverageOutboundCallsPerAgent', 'totalStaffTime', 'AverageStaffTime', 'totalAcwTime', 'AverageAcwTime', 'totalTalkTimeInbound', 'totalTalkTimeOutbound', 'totalBreakTime', 'totalHoldTime', 'totalIdleTime', 'AverageTalkTimeInbound', 'AverageTalkTimeOutbound'];
                                    var tagHeaders = ['Date', 'TotalInbound', 'TotalOutbound', 'TotalQueued', 'TotalQueueAnswered', 'TotalQueueDropped', 'TotalStaffCount', 'AverageInboundCallsPerAgent', 'AverageOutboundCallsPerAgent', 'TotalStaffTime', 'AverageStaffTime', 'TotalAcwTime', 'AverageAcwTime', 'TotalTalkTimeInbound', 'TotalTalkTimeOutbound', 'TotalBreakTime', 'TotalHoldTime', 'TotalIdleTime', 'AverageTalkTimeInbound', 'AverageTalkTimeOutbound'];

                                    var reportData = results.map(function (record) {

                                        record.totalStaffTime = TimeFormatter(record.totalStaffTime);
                                        record.totalAcwTime = TimeFormatter(record.totalAcwTime);
                                        record.AverageStaffTime = TimeFormatter(record.AverageStaffTime);
                                        record.AverageAcwTime = TimeFormatter(record.AverageAcwTime);
                                        record.totalTalkTimeInbound = TimeFormatter(record.totalTalkTimeInbound);
                                        record.totalTalkTimeOutbound = TimeFormatter(record.totalTalkTimeOutbound);
                                        record.totalBreakTime = TimeFormatter(record.totalBreakTime);
                                        record.totalHoldTime = TimeFormatter(record.totalHoldTime);
                                        record.totalIdleTime = TimeFormatter(record.totalIdleTime);
                                        record.AverageTalkTimeInbound = TimeFormatter(record.AverageTalkTimeInbound);
                                        record.AverageTalkTimeOutbound = TimeFormatter(record.AverageTalkTimeOutbound);

                                        return record;
                                    });

                                    var csvFileData = json2csv({ data: reportData, fields: tagOrder, fieldNames : tagHeaders });

                                    fs.writeFile(fileName, csvFileData, function(err) {
                                        if (err) {
                                            fileService.DeleteFile(company, tenant, uniqueId, function(err, delData){
                                                if(err) {
                                                    logger.error('[DVP-ArdsMonitor.DownloadCallCenterPerformance] - Delete Failed : %s', err);
                                                }
                                            });
                                        } else {

                                            var formData = {
                                                class: 'CALLCENTERPERFORMANCE',
                                                fileCategory:'REPORTS',
                                                display: fileName,
                                                filename: fileName,
                                                attachments: [
                                                    fs.createReadStream(fileName)
                                                ]

                                            };

                                            fileService.UploadFile(company, tenant, uniqueId, formData, function(err, uploadResp) {
                                                fs.unlink(fileName);
                                                if(!err && uploadResp) {

                                                } else {
                                                    fileService.DeleteFile(company, tenant, uniqueId, function(err, delData){
                                                        if(err) {
                                                            logger.error('[DVP-ArdsMonitor.DownloadCallCenterPerformance] - Delete Failed : %s', err);
                                                        }
                                                    });
                                                }

                                            });

                                        }
                                    });
                                }).catch(function(err) {
                                    fileService.DeleteFile(company, tenant, uniqueId, function(err, delData){
                                        if(err) {
                                            logger.error('[DVP-ArdsMonitor.DownloadCallCenterPerformance] - Delete Failed : %s', err);
                                        }
                                    });
                                });


                            }).catch(function(err) {

                                fileService.DeleteFile(company, tenant, uniqueId, function(err, delData){
                                    if(err) {
                                        logger.error('[DVP-ArdsMonitor.DownloadCallCenterPerformance] - Delete Failed : %s', err);
                                    }
                                });
                            });


                        } else {

                            jsonString = messageFormatter.FormatMessage(new Error('Failed to reserve file'), "ERROR", false, null);
                            logger.debug('[DVP-ArdsMonitor.DownloadCallCenterPerformance] - API RESPONSE : %s', jsonString);
                            res.end(jsonString);

                        }

                    }
                });

            }else {
                jsonString = messageFormatter.FormatMessage(new Error('Error deleting file'), "ERROR", false, null);
                logger.debug('[DVP-CDRProcessor.PrepareDownloadAbandon] - API RESPONSE : %s', jsonString);
                res.end(jsonString);
            }
        }).catch(function(err){
            jsonString = messageFormatter.FormatMessage(err, "ERROR", false, null);
            logger.debug('[DVP-CDRProcessor.PrepareDownloadAbandon] - API RESPONSE : %s', jsonString);
            res.end(jsonString);
        });
    }
    catch(ex){
        jsonString = messageFormatter.FormatMessage(ex, "ERROR", false, null);
        logger.debug('[DVP-CDRProcessor.PrepareDownloadAbandon] - API RESPONSE : %s', jsonString);
        res.end(jsonString);
    }
};

module.exports.GetCallCenterPerformance = GetCallCenterPerformance;
module.exports.PrepareForDownloadCallCenterPerformance = PrepareForDownloadCallCenterPerformance;