var util = require('util');
var EventEmitter = require('events').EventEmitter;
var resourceHandler = require('dvp-ardscommon/ResourceHandler.js');
var redisHandler = require('dvp-ardscommon/RedisHandler.js');
var commonMethods = require('dvp-ardscommon/CommonMethods');
var dbConn = require('dvp-dbmodels');

var ProcessResourceData = function(logkey,resource, callback){
    //var e = new EventEmitter();
    //process.nextTick(function () {
        if (resource) {
            //var count = 0;
            //for (var i in resourcelist) {
                //var resource = resourcelist[i].Obj;
                var companyStr =resource.Company.toString();
                var tenantStr =resource.Tenant.toString();
                var concurrencyTags = ["company_" + companyStr, "tenant_" + tenantStr, "resourceid_"+resource.ResourceId,"objtype_ConcurrencyInfo"];
                redisHandler.SearchObj_T(logkey,concurrencyTags,function(cErr, cResult){
                        var tempConcurrencyInfos = [];
                        var pcd = ProcessConcurrencyData(logkey,cResult);
                        pcd.on('concurrencyInfo', function (obj) {
                            tempConcurrencyInfos.push(obj);
                        });
                        pcd.on('endConcurrencyInfo', function () {
                            //count++;
                            resource.ConcurrencyInfo = tempConcurrencyInfos;
                            callback(resource);
                        });
                });
            //}
        }
        else {
            //e.emit('endResourceInfo');
            callback(resource);
        }
    //});

    //return (e);
};

var GetResourceStatus = function(logkey,resource, callback){
    var statusKey = util.format("ResourceState:%d:%d:%d", resource.Company, resource.Tenant, resource.ResourceId);
    redisHandler.GetObj(logkey,statusKey,function(sErr,sResult){
        resource.Status = JSON.parse(sResult);
        callback(resource);
    });
};

var ProcessCsData = function(logkey, concurrencyInfo, callback){
    var csTags = ["company_" + concurrencyInfo.Company.toString(), "tenant_" + concurrencyInfo.Tenant.toString(),"handlingType_"+concurrencyInfo.HandlingType, "resourceid_"+concurrencyInfo.ResourceId,"objtype_CSlotInfo"];
    redisHandler.SearchObj_T(logkey,csTags,function(csErr, csResult){
        concurrencyInfo.SlotInfo = csResult;
        callback(concurrencyInfo);
    });
};

var ProcessConcurrencyData = function(logkey,concurrencyInfos){
    var e = new EventEmitter();
    process.nextTick(function () {
        if (Array.isArray(concurrencyInfos) && concurrencyInfos.length>0) {
            var count = 0;
            for (var i in concurrencyInfos) {
                var concurrencyInfo = concurrencyInfos[i];
                //var csTags = ["company_" + concurrencyInfo.Company.toString(), "tenant_" + concurrencyInfo.Tenant.toString(),"handlingType_"+concurrencyInfo.HandlingType, "resourceid_"+concurrencyInfo.ResourceId,"objtype_CSlotInfo"];
                ProcessCsData(logkey,concurrencyInfo,function(concurrencyInfo){
                    count++;
                    e.emit('concurrencyInfo', concurrencyInfo);
                    if (concurrencyInfos.length === count) {
                        e.emit('endConcurrencyInfo');
                    }
                });
            }
        }
        else {
            e.emit('endConcurrencyInfo');
        }
    });

    return (e);
};

var SearchResourceByTags = function (logkey, searchTags, callback) {
    redisHandler.SearchObj_V_T(logkey, searchTags, function (err, result) {
        if (err) {
            console.log(err);
            callback(err, []);
        }
        else {
            var tempResourceInfos = [];
            var count = 0;
            if(result && result.length >0) {
                for (var i in result) {
                    var resource = result[i].Obj;
                    GetResourceStatus(logkey, resource, function (res) {
                        ProcessResourceData(logkey, res, function (tempResource) {
                            count++;
                            tempResourceInfos.push(tempResource);
                            if (count == result.length) {
                                callback(null, tempResourceInfos);
                            }
                        });
                    });
                }
            }else{
                callback(null, tempResourceInfos);
            }
        }
    });
};

var GetAllResources = function (logkey, company, tenant, callback) {
    var searchTags = ["company_" + company, "tenant_" + tenant, "objtype_Resource"];
    SearchResourceByTags(logkey, searchTags, function (err, returnlist) {
        callback(err, returnlist);
    });
};

var GetResourcesBySkills = function (logkey, company, tenant, skills, callback) {
    var searchTags = ["company_" + company, "tenant_" + tenant, "objtype_Resource"];
    var sortedAttributes = commonMethods.sortData(skills);
    for (var k in sortedAttributes) {
        searchTags.push("attribute_" + sortedAttributes[k]);
    }


    SearchResourceByTags(logkey, searchTags, function (err, returnlist) {
        callback(err, returnlist);
    });
};

var GetResourceFilterByClassTypeCategory = function (logkey, company, tenant, resClass, resType, resCategory, callback) {
    var searchTags = ["company_" + company, "tenant_" + tenant, "class_" + resClass, "type_" + resType, "category_" + resCategory, "objtype_Resource"];
    SearchResourceByTags(logkey, searchTags, function (err, returnlist) {
        callback(err, returnlist);
    });
};


var GetResourceStatusDurationList = function(startTime, endTime, resourceId, companyId, tenantId, pageNo, rowCount, callback)
{
    var emptyArr = [];
    try
    {
        var defaultQuery = {where :[{CompanyId: companyId, TenantId: tenantId, ResourceId: resourceId, StatusType: 'SloatStatus', Status: 'AfterWork', createdAt: {between:[startTime, endTime]}}],
            offset: ((pageNo - 1) * rowCount),
            limit: rowCount,
            order: ['createdAt']};


        dbConn.ResResourceStatusDurationInfo.findAll(defaultQuery).then(function(resourceInfoList)
        {
            callback(null, resourceInfoList)

        }).catch(function(err)
        {
            callback(err, emptyArr)
        });

    }
    catch(ex)
    {
        callback(ex, emptyArr);
    }
};

var GetResourceStatusDurationSummery = function(startTime, endTime, resourceId, companyId, tenantId, callback)
{
    var emptyArr = [];
    try
    {
        var defaultQuery = {
            attributes: [[dbConn.SequelizeConn.fn('COUNT', dbConn.SequelizeConn.col('*')), 'TotalAcwSessions'],[dbConn.SequelizeConn.fn('SUM', dbConn.SequelizeConn.col('Duration')), 'TotalAcwTime'],[dbConn.SequelizeConn.fn('AVG', dbConn.SequelizeConn.col('Duration')), 'AverageAcwTime']],
            where :[{CompanyId: companyId, TenantId: tenantId, ResourceId: resourceId, StatusType: 'SloatStatus', Status: 'AfterWork', createdAt: {between:[startTime, endTime]}}]
        };


        dbConn.ResResourceStatusDurationInfo.find(defaultQuery).then(function(resourceInfoList)
        {
            callback(null, resourceInfoList)

        }).catch(function(err)
        {
            callback(err, emptyArr)
        });

    }
    catch(ex)
    {
        callback(ex, emptyArr);
    }
};

module.exports.GetAllResources = GetAllResources;
module.exports.GetResourceFilterByClassTypeCategory = GetResourceFilterByClassTypeCategory;
module.exports.GetResourcesBySkills = GetResourcesBySkills;
module.exports.GetResourceStatusDurationList = GetResourceStatusDurationList;
module.exports.GetResourceStatusDurationSummery = GetResourceStatusDurationSummery;