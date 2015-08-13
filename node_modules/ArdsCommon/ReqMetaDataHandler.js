var util = require('util');
var redisHandler = require('./RedisHandler.js');
var infoLogger = require('./InformationLogger.js');
var dbConn = require('DVP-DBModels');
var EventEmitter = require('events').EventEmitter;


var IterateData = function (data) {
    var e = new EventEmitter();
    process.nextTick(function () {
        if (Array.isArray(data)) {
            var count = 0;
            for (var i in data) {
                var val = data[i];
                
                e.emit('continueIterateData', val);
                count++;
                
                if (data.length === count) {
                    e.emit('endIterateData');
                }
            }
        }
        else {
            e.emit('endIterateData');
        }
    });
    
    return (e);
};

var SetAttributeJunctionInfo = function (attributeMetaObj, attributes, callback) {
    attributeMetaObj.setArdsAttributeinfo(null).then(function (result) {
        var saji = IterateData(attributes);
        saji.on('continueIterateData', function (obj) {
            dbConn.ArdsAttributeinfo.find({ where: [{ Tenant: attributeMetaObj.Tenant }, { Company: attributeMetaObj.Company }, { Attribute: obj }] }).then(function (results) {
                if (results) {
                    results.addArdsAttributeMetadata(attributeMetaObj).then(function (result) {

                    }).catch(function (resMapGroup) {

                    });
                }
            }).error(function (err) {
                //callback(err, "Failed");
            });
        });
        saji.on('endIterateData', function (obj) {
            callback("done");
        });
    }).catch(function (resMapGroup) {
        console.log(resMapGroup);
        callback("Failed");
    });
    
};

var SetAttributeMetaData = function (company, tenant, reqMetaId, atrributeMetaInfo, callback) {
    var sam = IterateData(atrributeMetaInfo);
    sam.on('continueIterateData', function (obj) {
        dbConn.ArdsAttributeMetadata.create(
            {
                Tenant: tenant,
                Company: company,
                AttributeClass: obj.AttributeClass,
                AttributeType: obj.AttributeType,
                AttributeCategory: obj.AttributeCategory,
                WeightPrecentage: obj.WeightPrecentage,
                RequestMetadataId: reqMetaId
            }
        ).then(function (results) {
        
            SetAttributeJunctionInfo(results, obj.AttributeCode, function () { });
        //callback(null, "OK");
        }).error(function (err) {
            callback(err, "Failed");
        });
    });
    sam.on('endIterateData', function (obj) {
        callback("OK");
    });
};

var UpdateAttributeMetaData = function (company, tenant, reqMetaId, atrributeMetaInfo, callback) {
    var sam = IterateData(atrributeMetaInfo);
    sam.on('continueIterateData', function (obj) {

        dbConn.ArdsAttributeMetadata.find({ where: [{ RequestMetadataId: reqMetaId }] }).then(function (results) {
            if (results) {
                results.updateAttributes({
                    Tenant: tenant,
                    Company: company,
                    AttributeClass: obj.AttributeClass,
                    AttributeType: obj.AttributeType,
                    AttributeCategory: obj.AttributeCategory,
                    WeightPrecentage: obj.WeightPrecentage
                }).then(function (results) {

                    SetAttributeJunctionInfo(results, obj.AttributeCode, function () { });
                    //callback(null, "OK");
                }).error(function (err) {
                    callback(err, "Failed");
                });
            }
        }).error(function (err) {
            callback(err, "Failed");
        });
    });
    sam.on('endIterateData', function (obj) {
        callback("OK");
    });
};


var AddMeataData = function (logKey, metaDataObj, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start AddMeataData *************************', logKey);

    var key = util.format('ReqMETA:%d:%d:%s:%s:%s', metaDataObj.Company, metaDataObj.Tenant, metaDataObj.Class, metaDataObj.Type, metaDataObj.Category);
    var tag = ["company_" + metaDataObj.Company, "tenant_" + metaDataObj.Tenant, "class_" + metaDataObj.Class, "type_" + metaDataObj.Type, "category_" + metaDataObj.Category, "objtype_ReqMETA"];
    
    var obj = JSON.stringify(metaDataObj);
    
    redisHandler.AddObj_T(logKey, key, obj, tag, function (err, result) {
        infoLogger.DetailLogger.log('info', '%s Finished AddMeataData- Redis. Result: %s', logKey, result);

        dbConn.ArdsRequestMetadata.create(
            {
                Tenant: metaDataObj.Tenant,
                Company: metaDataObj.Company,
                Class: metaDataObj.Class,
                Type: metaDataObj.Type,
                Category: metaDataObj.Category,
                ServingAlgo: metaDataObj.ServingAlgo,
                HandlingAlgo: metaDataObj.HandlingAlgo,
                SelectionAlgo: metaDataObj.SelectionAlgo,
                ReqHandlingAlgo: metaDataObj.ReqHandlingAlgo,
                ReqSelectionAlgo: metaDataObj.ReqSelectionAlgo,
                MaxReservedTime: metaDataObj.MaxReservedTime,
                MaxRejectCount: metaDataObj.MaxRejectCount
            }
        ).then(function (results) {
            
            SetAttributeMetaData(metaDataObj.Company, metaDataObj.Tenant, results.RequestMetadataId, metaDataObj.AttributeMeta, function () {
                infoLogger.DetailLogger.log('info', '%s Finished AddMeataData-pgsql. Result: %s', logKey, result);
                callback(null, "OK");
            });
        }).error(function (err) {
            callback(err, "Failed");
        });
    });
};

var ReaddMetaData = function (metaDataObj, callback) {
    var key = util.format('ReqMETA:%d:%d:%s:%s:%s', metaDataObj.Company, metaDataObj.Tenant, metaDataObj.Class, metaDataObj.Type, metaDataObj.Category);
    var tag = ["company_" + metaDataObj.Company, "tenant_" + metaDataObj.Tenant, "class_" + metaDataObj.Class, "type_" + metaDataObj.Type, "category_" + metaDataObj.Category, "objtype_ReqMETA"];
    
    var obj = JSON.stringify(metaDataObj);
    
    redisHandler.AddObj_T(logKey, key, obj, tag, function (err, result) {
        infoLogger.DetailLogger.log('info', 'Finished ReAddMeataData- Redis. Result: %s', result);
    });
};

var SetMeataData = function (logKey, metaDataObj, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start SetMeataData *************************', logKey);

    var key = util.format('ReqMETA:%d:%d:%s:%s:%s', metaDataObj.Company, metaDataObj.Tenant, metaDataObj.Class, metaDataObj.Type, metaDataObj.Category);
    var tag = ["company_" + metaDataObj.Company, "tenant_" + metaDataObj.Tenant, "class_" + metaDataObj.Class, "type_" + metaDataObj.Type, "category_" + metaDataObj.Category, "objtype_ReqMETA"];
    
    var obj = JSON.stringify(metaDataObj);
    
    redisHandler.SetObj_T(logKey, key, obj, tag, function (err, result) {
        infoLogger.DetailLogger.log('info', '%s Finished SetMeataData. Result: %s', logKey, result);
        
        dbConn.ArdsRequestMetadata.find({ where: [{ Tenant: metaDataObj.Tenant }, { Company: metaDataObj.Company }, { Class: metaDataObj.Class }, { Type: metaDataObj.Type }, { Category: metaDataObj.Category }] }).then(function (results) {
            if (results) {
                results.updateAttributes({
                    ServingAlgo: metaDataObj.ServingAlgo,
                    HandlingAlgo: metaDataObj.HandlingAlgo,
                    SelectionAlgo: metaDataObj.SelectionAlgo,
                    ReqHandlingAlgo: metaDataObj.ReqHandlingAlgo,
                    ReqSelectionAlgo: metaDataObj.ReqSelectionAlgo,
                    MaxReservedTime: metaDataObj.MaxReservedTime,
                    MaxRejectCount: metaDataObj.MaxRejectCount
                }).then(function (results) {

                    UpdateAttributeMetaData(metaDataObj.Company, metaDataObj.Tenant, results.RequestMetadataId, metaDataObj.AttributeMeta, function () {
                        infoLogger.DetailLogger.log('info', '%s Finished AddMeataData-pgsql. Result: %s', logKey, result);
                        callback(null, "OK");
                    });
                }).error(function (err) {
                    callback(err, "Failed");
                });
            }
        }).error(function (err) {
            callback(err, "Failed");
        });

        //callback(err, result);
    });
};

var GetMeataData = function (logKey, company, tenant, mclass, type, category, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start GetMeataData *************************', logKey);

    var key = util.format('ReqMETA:%s:%s:%s:%s:%s', company, tenant, mclass, type, category);
    redisHandler.GetObj(logKey, key, function (err, result) {
        infoLogger.DetailLogger.log('info', '%s Finished GetMeataData. Result: %s', logKey, result);
        callback(err, result);
    });
};

var SearchMeataDataByTags = function (logKey, tags, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start SearchMeataDataByTags *************************', logKey);

    if (Array.isArray(tags)) {
        tags.push("objtype_ReqMETA");
        redisHandler.SearchObj_T(logKey, tags, function (err, result) {
        infoLogger.DetailLogger.log('info', '%s Finished SearchMeataDataByTags. Result: %s', logKey, result);
        callback(err, result);
        });
    }
    else {
        var e = new Error();
        e.message = "tags must be a string array";
        infoLogger.DetailLogger.log('info', '%s Finished SearchMeataDataByTags. Result: tags must be a string array', logKey);
        callback(e, null);
    }
};

var RemoveMeataData = function (logKey, company, tenant, mclass, type, category, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start RemoveMeataData *************************', logKey);

    var key = util.format('ReqMETA:%s:%s:%s:%s:%s', company, tenant, mclass, type, category);
    
    redisHandler.GetObj(logKey, key, function (err, obj) {
        if (err) {
            callback(err, "false");
        }
        else {
            var metaDataObj = JSON.parse(obj);
            var tag = ["company_" + metaDataObj.Company, "tenant_" + metaDataObj.Tenant, "class_" + metaDataObj.Class, "type_" + metaDataObj.Type, "category_" + metaDataObj.Category, "objtype_ReqMETA"];
    
            redisHandler.RemoveObj_T(logKey, key, tag, function (err, result) {
                dbConn.ArdsRequestMetadata.find({ where: [{ Tenant: metaDataObj.Tenant }, { Company: metaDataObj.Company }, { Class: metaDataObj.Class }, { Type: metaDataObj.Type }, { Category: metaDataObj.Category }] }).then(function (reqMeta) {
                    if (reqMeta) {
                        dbConn.ArdsAttributeMetadata.destroy({ where: [{ RequestMetadataId: reqMeta.RequestMetadataId }] }).then(function (results) {
                            if (results) {
                            }
                        }).error(function (err) {
                        });
                        reqMeta.destroy({ where: [{ Tenant: metaDataObj.Tenant }, { Company: metaDataObj.Company }, { Class: metaDataObj.Class }, { Type: metaDataObj.Type }, { Category: metaDataObj.Category }] }).then(function (results) {
                            if (results) {
                        
                                infoLogger.DetailLogger.log('info', '%s Finished RemoveMeataData. Result: %s', logKey, result);
                                callback(err, result);
                            }
                        }).error(function (err) {
                            callback(err, "Failed");
                        });
                    }
                }).error(function (err) {
                    callback(err, "Failed");
                });

            });
        }
    });
};


var ReloadMetaData = function (company, tenant, mclass, type, category) {
    dbConn.ArdsRequestMetadata.find({
        where: [{ Tenant: tenant }, { Company: company }, { Class: mclass }, { Type: type }, { Category: category }], include: [{ model: dbConn.ArdsAttributeMetadata, as: "ArdsAttributeMetadata", include: [{ model: dbConn.ArdsAttributeinfo, as: "ArdsAttributeinfo" }] }]
    }).then(function (reqMeta) {
        if (reqMeta) {
            var ddd = JSON.stringify(reqMeta);
            var attMetaData = [];
            
            for (var i in reqMeta.ArdsAttributeMetadata) {
                var objattMeta = reqMeta.ArdsAttributeMetadata[i];
                var attData = [];
                for (var j in objattMeta.ArdsAttributeinfo) {
                    var objatt = objattMeta.ArdsAttributeinfo[j];
                    attData.push(objatt.Attribute);
                }
                tempattMeta = { AttributeClass: objattMeta.AttributeClass, AttributeType: objattMeta.AttributeType, AttributeCategory: objattMeta.AttributeCategory, WeightPrecentage: objattMeta.WeightPrecentage, AttributeCode: attData };
                attMetaData.push(tempattMeta);
            }
            
            var metaDataObj = { Company: reqMeta.Company, Tenant: reqMeta.Tenant, Class: reqMeta.Class, Type: reqMeta.Type, Category: reqMeta.Category, ServingAlgo: reqMeta.ServingAlgo, HandlingAlgo: reqMeta.HandlingAlgo, SelectionAlgo: reqMeta.SelectionAlgo, MaxReservedTime: reqMeta.MaxReservedTime, MaxRejectCount: reqMeta.MaxRejectCount, ReqHandlingAlgo: reqMeta.ReqHandlingAlgo, ReqSelectionAlgo: reqMeta.ReqSelectionAlgo, AttributeMeta: attMetaData };
            ReaddMetaData(metaDataObj, function () { });
            return metaDataObj;
        }
    }).error(function (err) {
        return null;
    });
};


module.exports.AddMeataData = AddMeataData;
module.exports.SetMeataData = SetMeataData;
module.exports.GetMeataData = GetMeataData;
module.exports.SearchMeataDataByTags = SearchMeataDataByTags;
module.exports.RemoveMeataData = RemoveMeataData;
module.exports.ReloadMetaData = ReloadMetaData;