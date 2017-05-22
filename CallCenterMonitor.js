/**
 * Created by Heshan.i on 3/24/2017.
 */


var dbConn = require('dvp-dbmodels');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var Q = require('q');
var async = require('async');
var moment = require('moment');

// Load data from pgsql database
var LoadCallCenterPerformanceData = function(tenant, company, startTime, endTime){
    var deferred = Q.defer();

    try
    {

        var callCenterPerformanceQuery = {
            where : [{Company: company, Tenant: tenant, WindowName: {$in:['CALLS', 'QUEUE', 'QUEUEANSWERED', 'CONNECTED', 'QUEUEDROPPED', 'LOGIN', 'AFTERWORK', 'BREAK', 'AGENTHOLD']}, SummaryDate: {between:[startTime, endTime]}}]
        };

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
            totalInbound: results[0].TotalInboundCallCount,
            totalOutbound: results[0].TotalOutboundCallCount,
            totalQueued: results[1].TotalQueued,
            totalQueueAnswered: results[6].TotalQueueAnswered,
            totalQueueDropped: results[3].TotalDropped,
            totalStaffTime: results[4].TotalStaffTime,
            totalAcwTime: results[5].TotalAcwTime,
            AverageStaffTime: results[4].TotalStaffCount?results[4].TotalStaffTime / results[4].TotalStaffCount: 0,
            AverageAcwTime: results[4].TotalStaffCount?results[5].TotalAcwTime / results[4].TotalStaffCount: 0,
            AverageInboundCallsPerAgent: results[2].TotalInboundAgentCount?results[2].TotalInboundAnswerCount/ results[2].TotalInboundAgentCount: 0,
            AverageOutboundCallsPerAgent: results[2].TotalOutboundAgentCount?results[0].TotalOutboundCallCount / results[2].TotalOutboundAgentCount: 0,
            TotalStaffCount: results[4].TotalStaffCount,


            totalTalkTimeInbound: results[2].TotalInboundAnswerTime,
            totalTalkTimeOutbound: results[2].TotalOutboundAnswerTime,
            totalBreakTime: results[7].TotalBreakTime,
            totalHoldTime: results[8].TotalHoldTime,
            AverageTalkTimeInbound: results[0].TotalInboundCallCount? results[2].TotalInboundAnswerTime / results[0].TotalInboundCallCount: 0,
            AverageTalkTimeOutbound: results[0].TotalOutboundCallCount? results[2].TotalOutboundAnswerTime / results[0].TotalOutboundCallCount: 0
        };

        deferred.resolve({Date:summaryDate, SummaryData: callCenterPerformance});
        //callCenterPerformanceSummary.push({Date:m_startTime, SummaryDate: callCenterPerformance})
        //callback(undefined, callCenterPerformance);
    }).catch(function(err) {
        deferred.resolve({Date:summaryDate, SummaryData: undefined});
    });

    return deferred.promise;

};

// Initiate performance calculation
var GetCallCenterPerformance = function (tenant, company, startTime, endTime, callback) {

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

    var callCenterPerformanceSummary = [];

    LoadCallCenterPerformanceData(tenant, company, startTime, endTime).then(function(performanceData){

        var summaryTasks = [];
        var m_endTime = moment(endTime);
        for (var m_startTime = moment(startTime); m_startTime.isBefore(m_endTime); m_startTime.add(1, 'days')) {
            var filterDate = m_startTime.format('YYYY-MM-DD');
            console.log(filterDate);

            var filterDataForDate = performanceData.filter(function (data) {
                return filterDate === moment(data.SummaryDate).format('YYYY-MM-DD');
            });

            summaryTasks.push(GetSingleDateSummary(filterDataForDate, m_startTime));
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

module.exports.GetCallCenterPerformance = GetCallCenterPerformance;