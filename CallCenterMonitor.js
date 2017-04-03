/**
 * Created by Heshan.i on 3/24/2017.
 */


var dbConn = require('dvp-dbmodels');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var Q = require('q');
var async = require('async');

var LoadCallCenterPerformanceData = function(tenant, company, startTime, endTime){
    var deferred = Q.defer();

    try
    {

        var callCenterPerformanceQuery = {
            where : [{Company: company, Tenant: tenant, WindowName: {$in:['CALLS', 'QUEUE', 'QUEUEANSWERED', 'CONNECTED', 'QUEUEDROPPED', 'LOGIN', 'AFTERWORK']}, SummaryDate: {between:[startTime, endTime]}}]
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
            TotalAnswerTime: 0
        };

        var answerData = performanceData.filter(function (pData) {
            return pData.WindowName === "CONNECTED";
        });

        answerData.forEach(function (answer) {
            result.TotalAnswerTime = result.TotalAnswerTime + answer.TotalTime;

            if(answer.Param2 === "CALLinbound"){
                result.TotalInboundAnswerCount = result.TotalInboundAnswerCount + answer.TotalCount;
                result.TotalInboundAgentCount = result.TotalInboundAgentCount + 1;
            }else{
                result.TotalOutboundAnswerCount = result.TotalOutboundAnswerCount + answer.TotalCount;
                result.TotalOutboundAgentCount = result.TotalOutboundAgentCount + 1;
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


var GetCallCenterPerformance = function (tenant, company, startTime, endTime, callback) {

    var callCenterPerformance = {
        totalInbound: 0,
        totalOutbound: 0,
        totalQueued: 0,
        totalQueueAnswered: 0,
        totalQueueDropped: 0,
        totalTalkTime: 0,
        totalStaffTime: 0,
        totalAcwTime: 0,
        AverageStaffTime: 0,
        AverageAcwTime: 0,
        AverageInboundCallsPerAgent: 0,
        AverageOutboundCallsPerAgent: 0,
        TotalLoginAgents: 0
    };

    LoadCallCenterPerformanceData(tenant, company, startTime, endTime).then(function(performanceData){

        var asyncTasks = [
            ProcessCalls(performanceData),
            ProcessQueues(performanceData),
            ProcessAnswer(performanceData),
            ProcessDropped(performanceData),
            ProcessLogin(performanceData),
            ProcessAfterWork(performanceData),
            ProcessQueueAnswer(performanceData)
        ];

        Q.all(asyncTasks).then(function (results) {
            callCenterPerformance = {
                totalInbound: results[0].TotalInboundCallCount,
                totalOutbound: results[0].TotalOutboundCallCount,
                totalQueued: results[1].TotalQueued,
                totalQueueAnswered: results[6].TotalQueueAnswered,
                totalQueueDropped: results[3].TotalDropped,
                totalTalkTime: results[2].TotalAnswerTime,
                totalStaffTime: results[4].TotalStaffTime,
                totalAcwTime: results[5].TotalAcwTime,
                AverageStaffTime: results[4].TotalStaffCount?results[4].TotalStaffTime / results[4].TotalStaffCount: 0,
                AverageAcwTime: results[4].TotalStaffCount?results[5].TotalAcwTime / results[4].TotalStaffCount: 0,
                AverageInboundCallsPerAgent: results[2].TotalInboundAgentCount?results[2].TotalInboundAnswerCount/ results[2].TotalInboundAgentCount: 0,
                AverageOutboundCallsPerAgent: results[2].TotalOutboundAgentCount?results[0].TotalOutboundCallCount / results[2].TotalOutboundAgentCount: 0,
                TotalStaffCount: results[4].TotalStaffCount
            };

            callback(undefined, callCenterPerformance);
        }).catch(function(err) {
            callback(err, undefined);
        });


    }).catch(function(err) {

        callback(err, undefined);
    });

};

module.exports.GetCallCenterPerformance = GetCallCenterPerformance;