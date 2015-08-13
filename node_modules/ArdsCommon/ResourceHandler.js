var util = require('util');
var redisHandler = require('./RedisHandler.js');
var EventEmitter = require('events').EventEmitter;
var sortArray = require('./SortArray.js');
var restClientHandler = require('./RestClient.js');
var infoLogger = require('./InformationLogger.js');
var config = require('config');

var SetConcurrencyInfo = function (data) {
    var e = new EventEmitter();
    process.nextTick(function () {
        if (Array.isArray(data)) {
            var count = 0;
            for (var i in data) {
                var val = data[i];

                e.emit('concurrencyInfo', val);
                count++;
                
                if (data.length === count) {
                    e.emit('endconcurrencyInfo');
                }
            }
        }
        else {
            e.emit('endconcurrencyInfo');
        }
    });

    return (e);
};

var RemoveConcurrencyInfo = function (logKey, data, callback) {
    for (var i in data) {
        redisHandler.GetObj(logKey, data[i], function (err, tempObj) {
            var slotInfoTags = [];
            var obj = JSON.parse(tempObj);
            if (obj.ObjKey.search(/^(ConcurrencyInfo)[^\s]*/) != -1) {
                slotInfoTags = ["company_" + obj.Company, "tenant_" + obj.Tenant, "class_" + obj.Class, "type_" + obj.Type, "category_" + obj.Category, "resourceid_" + obj.ResourceId, "objtype_ConcurrencyInfo"];
            }
            else {
                slotInfoTags = ["company_" + obj.Company, "tenant_" + obj.Tenant, "class_" + obj.Class, "type_" + obj.Type, "category_" + obj.Category, "state_" + obj.State, "resourceid_" + obj.ResourceId, "objtype_CSlotInfo", "slotid_" + obj.SlotId];
            }

            redisHandler.RemoveObj_V_T(logKey, obj.ObjKey, slotInfoTags, function (err, result) {
                if (err) {
                    console.log(err);
                }
            });
        });
    }
};

var RemoveResourceState = function (logKey, company, tenant, resourceid, callback) {
    var StateKey = util.format('ResourceState:%d:%d:%s', company, tenant, resourceid);
    redisHandler.RemoveObj(logKey, StateKey, function (err, result) {
        callback(err, result);
    });
}

var AddResource = function (logKey, basicData, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start AddResource *************************', logKey);

    var concurrencyInfo = [];
    var sci = SetConcurrencyInfo(basicData.ConcurrencyInfo);
    
    sci.on('concurrencyInfo', function (obj) {
        var concurrencySlotInfo = [];
        for (var i = 0; i < obj.NoOfSlots; i++) {
            var slotInfokey = util.format('CSlotInfo:%d:%d:%s:%s:%s:%s:%d', basicData.Company, basicData.Tenant, basicData.ResourceId, obj.Class, obj.Type, obj.Category, i);
            var slotInfo = { Company: basicData.Company, Tenant: basicData.Tenant, Class: obj.Class, Type: obj.Type, Category: obj.Category, State: "Available", HandlingRequest: "", LastReservedTime: "", ResourceId: basicData.ResourceId, SlotId: i, ObjKey: slotInfokey, OtherInfo: "" };
            var slotInfoTags = ["company_" + slotInfo.Company, "tenant_" + slotInfo.Tenant, "class_" + slotInfo.Class, "type_" + slotInfo.Type, "category_" + slotInfo.Category, "state_" + slotInfo.State, "resourceid_" + basicData.ResourceId, "slotid_" + i, "objtype_CSlotInfo"];
            concurrencyInfo.push(slotInfokey);

            var jsonSlotObj = JSON.stringify(slotInfo);
            redisHandler.AddObj_V_T(logKey, slotInfokey, jsonSlotObj, slotInfoTags, function (err, reply, vid) {
                if (err) {
                    console.log(err);
                }
            });
        }
        var cObjkey = util.format('ConcurrencyInfo:%d:%d:%s:%s:%s:%s', basicData.Company, basicData.Tenant, basicData.ResourceId, obj.Class, obj.Type, obj.Category);
        var concurrencyObj = { Company: basicData.Company, Tenant: basicData.Tenant, Class: obj.Class, Type: obj.Type, Category: obj.Category, LastConnectedTime: "", RejectCount: 0, ResourceId: basicData.ResourceId, ObjKey: cObjkey };
        var cObjTags = ["company_" + concurrencyObj.Company, "tenant_" + concurrencyObj.Tenant, "class_" + concurrencyObj.Class, "type_" + concurrencyObj.Type, "category_" + concurrencyObj.Category, "resourceid_" + basicData.ResourceId, "objtype_ConcurrencyInfo"];
        concurrencyInfo.push(cObjkey);

        var jsonConObj = JSON.stringify(concurrencyObj);
        redisHandler.AddObj_V_T(logKey, cObjkey, jsonConObj, cObjTags, function (err, reply, vid) {
            if (err) {
                console.log(err);
            }
        });
    });
    
    sci.on('endconcurrencyInfo', function () {
        var resourceObj = { Company: basicData.Company, Tenant: basicData.Tenant, Class: basicData.Class, Type: basicData.Type, Category: basicData.Category, ResourceId: basicData.ResourceId, ResourceAttributeInfo: basicData.ResourceAttributeInfo, ConcurrencyInfo: concurrencyInfo, OtherInfo: basicData.OtherInfo };

        var key = util.format('Resource:%d:%d:%s', resourceObj.Company, resourceObj.Tenant, resourceObj.ResourceId);
        var tag = ["company_" + resourceObj.Company, "tenant_" + resourceObj.Tenant, "class_" + resourceObj.Class, "type_" + resourceObj.Type, "category_" + resourceObj.Category, "resourceid_" + resourceObj.ResourceId, "objtype_Resource"];
        
        var tempAttributeList = [];
        for (var i in resourceObj.ResourceAttributeInfo) {
            tempAttributeList.push(resourceObj.ResourceAttributeInfo[i].Attribute);
        }
        var sortedAttributes = sortArray.sortData(tempAttributeList);
        for (var k in sortedAttributes) {
            tag.push("attribute_" + sortedAttributes[k]);
        }
        var jsonObj = JSON.stringify(resourceObj);

        redisHandler.AddObj_V_T(logKey, key, jsonObj, tag, function (err, reply, vid) {
            var StateKey = util.format('ResourceState:%d:%d:%s', resourceObj.Company, resourceObj.Tenant, resourceObj.ResourceId);
            redisHandler.SetObj(logKey, StateKey, "Available", function (err, result) {
            });
            infoLogger.DetailLogger.log('info', '%s Finished AddResource. Result: %s', logKey, reply);
            callback(err, reply, vid);
        });
    });
};

var RemoveResource = function (logKey, company, tenant, resourceId, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start RemoveResource *************************', logKey);

    var key = util.format('Resource:%s:%s:%s', company, tenant, resourceId);
    redisHandler.GetObj(logKey, key, function (err, obj) {
        if (err) {
            callback(err, "false");
        }
        else {
            
            var resourceObj = JSON.parse(obj);
            RemoveConcurrencyInfo(logKey, resourceObj.ConcurrencyInfo, function () {
            });
            RemoveResourceState(logKey, resourceObj.Company, resourceObj.Tenant, resourceObj.ResourceId, function () {
            });
            var tag = ["company_" + resourceObj.Company, "tenant_" + resourceObj.Tenant, "class_" + resourceObj.Class, "type_" + resourceObj.Type, "category_" + resourceObj.Category, "objtype_Resource", "resourceid_" + resourceObj.ResourceId];
            var tempAttributeList = [];
            for (var i in resourceObj.ResourceAttributeInfo) {
                tempAttributeList.push(resourceObj.ResourceAttributeInfo[i].Attribute);
            }
            var sortedAttributes = sortArray.sortData(tempAttributeList);
            for (var k in sortedAttributes) {
                tag.push("attribute_" + sortedAttributes[k]);
            }

            redisHandler.RemoveObj_V_T(logKey, key, tag, function (err, result) {
                if (err) {
                    infoLogger.DetailLogger.log('info', '%s Finished RemoveResource. Result: %s', logKey, "false");
                    callback(err, "false");
                }
                else {
                    infoLogger.DetailLogger.log('info', '%s Finished RemoveResource. Result: %s', logKey, result);
                    callback(null, result);
                }
            });
        }
    });
};

var SetResource = function (logKey, basicObj, cVid, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start SetResource *************************', logKey);

    var key = util.format('Resource:%d:%d:%s', resourceObj.Company, resourceObj.Tenant, resourceObj.ResourceId);
    
    redisHandler.GetObj(logKey, key, function (err, jobj) {
        if (err) {
            console.log(err);
        }
        else {
            var obj = JSON.parse(jobj);
            var resourceObj = { Company: basicData.Company, Tenant: basicData.Tenant, Class: basicData.Class, Type: basicData.Type, Category: basicData.Category, ResourceId: basicData.ResourceId, ResourceAttributeInfo: basicData.ResourceAttributeInfo, ConcurrencyInfo: obj.ConcurrencyInfo, State: obj.State };
            
            var tag = ["company_" + resourceObj.Company, "tenant_" + resourceObj.Tenant, "class_" + resourceObj.Class, "type_" + resourceObj.Type, "category_" + resourceObj.Category, "objtype_Resource", "resourceid_" + resourceObj.ResourceId];
            var tempAttributeList = [];
            for (var i in resourceObj.ResourceAttributeInfo) {
                tempAttributeList.push(resourceObj.ResourceAttributeInfo[i].Attribute);
            }
            var sortedAttributes = sortArray.sortData(tempAttributeList);
            for (var k in sortedAttributes) {
                tag.push("attribute_" + sortedAttributes[k]);
            }
            var jsonObj = JSON.stringify(resourceObj);
            
            redisHandler.SetObj_V_T(logKey, key, jsonObj, tag, cVid, function (err, reply, vid) {
                infoLogger.DetailLogger.log('info', '%s Finished SetResource. Result: %s', logKey, reply);
                callback(err, reply, vid);
            });
        }
    });
};

var GetResource = function (logKey, company, tenant, resourceId, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start GetResource *************************', logKey);

    var key = util.format('Resource:%s:%s:%s', company, tenant, resourceId);
    redisHandler.GetObj_V(logKey, key, function (err, result, vid) {
        infoLogger.DetailLogger.log('info', '%s Finished GetResource. Result: %s', logKey, result);
        callback(err, result, vid);
    });
};

var SearchResourcebyTags = function (logKey, tags, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start SearchResourcebyTags *************************', logKey);

    if (Array.isArray(tags)) {
        tags.push("objtype_Resource");
        redisHandler.SearchObj_V_T(logKey, tags, function (err, result) {
            infoLogger.DetailLogger.log('info', '%s Finished SearchResourcebyTags. Result: %s', logKey, result);
            callback(err, result);
        });
    }
    else {
        var e = new Error();
        e.message = "tags must be a string array";
        infoLogger.DetailLogger.log('info', '%s Finished SearchResourcebyTags. Result: %s', logKey, "tags must be a string array");
        callback(e, null);
    }
};

var UpdateLastConnectedTime = function (logKey, company, tenant, cinfoclass, type, category, resourceid, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start UpdateLastConnectedTime *************************', logKey);

    var cObjkey = util.format('ConcurrencyInfo:%d:%d:%s:%s:%s:%s', company, tenant, resourceid, cinfoclass, type, category);
    var date = new Date();

    redisHandler.GetObj_V(logKey, cObjkey, function (err, obj, vid) {
        if (err) {
            console.log(err);
        }
        else {
            var cObj = JSON.parse(obj);
            cObj.LastConnectedTime = date.toISOString();
            var jCObj = JSON.stringify(cObj);
            var cObjTags = ["company_" + cObj.Company, "tenant_" + cObj.Tenant, "class_" + cObj.Class, "type_" + cObj.Type, "category_" + cObj.Category, "resourceid_" + cObj.ResourceId, "objtype_ConcurrencyInfo"];
        
            redisHandler.SetObj_V_T(logKey, cObjkey, jCObj, cObjTags, vid, function () {
                infoLogger.DetailLogger.log('info', '%s Finished UpdateLastConnectedTime. Result: %s', logKey, result);
                callback(err, result, vid);
            });
        }
    });
};

var UpdateRejectCount = function (logKey, company, tenant, cinfoclass, type, category, resourceid, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start UpdateRejectCount *************************', logKey);

    var cObjkey = util.format('ConcurrencyInfo:%d:%d:%s:%s:%s:%s', company, tenant, resourceid, cinfoclass, type, category);
    var date = new Date();
    
    redisHandler.GetObj_V(logKey, cObjkey, function (err, obj, vid) {
        if (err) {
            console.log(err);
        }
        else {
            var cObj = JSON.parse(obj);
            cObj.RejectCount = cObj.RejectCount + 1;
            var jCObj = JSON.stringify(cObj);
            var cObjTags = ["company_" + cObj.Company, "tenant_" + cObj.Tenant, "class_" + cObj.Class, "type_" + cObj.Type, "category_" + cObj.Category, "resourceid_" + cObj.ResourceId, "objtype_ConcurrencyInfo"];
            
            redisHandler.SetObj_V_T(logKey, cObjkey, jCObj, cObjTags, vid, function () {
                infoLogger.DetailLogger.log('info', '%s Finished UpdateRejectCount. Result: %s', logKey, result);
                callback(err, result, vid);
            });
        }
    });
};

var UpdateSlotStateAvailable = function (logKey, company, tenant, slotclass, type, category, resourceid, slotid, otherInfo, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start UpdateSlotStateAvailable *************************', logKey);

    var slotInfokey = util.format('CSlotInfo:%s:%s:%s:%s:%s:%s:%s', company, tenant, resourceid, slotclass, type, category, slotid);
    redisHandler.GetObj_V(logKey, slotInfokey, function (err, obj, vid) {
        if (err) {
            console.log(err);
            callback(err, false);
        }
        else {
            var tempObj = JSON.parse(obj);
            if (otherInfo == "Reject") {
                UpdateRejectCount(logKey, tempObj.Company, tempObj.Tenant, tempObj.Class, tempObj.Type, tempObj.Category, tempObj.ResourceId, function () { });
            }
            tempObj.State = "Available";
            tempObj.HandlingRequest = "";
            tempObj.OtherInfo = "";
            var slotInfoTags = ["company_" + tempObj.Company, "tenant_" + tempObj.Tenant, "class_" + tempObj.Class, "type_" + tempObj.Type, "category_" + tempObj.Category, "state_" + tempObj.State, "resourceid_" + tempObj.ResourceId, "slotid_" + tempObj.SlotId, "objtype_CSlotInfo"];
            var jsonObj = JSON.stringify(tempObj);
            redisHandler.SetObj_V_T(logKey, slotInfokey, jsonObj, slotInfoTags, vid, function (err, reply, vid) {
                infoLogger.DetailLogger.log('info', '%s Finished UpdateSlotStateAvailable. Result: %s', logKey, reply);
                callback(err, reply);
            });
        }
    });
};

var UpdateSlotStateReserved = function (logKey, company, tenant, slotclass, type, category, resourceid, slotid, sessionid, otherInfo, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start UpdateSlotStateReserved *************************', logKey);

    var slotInfokey = util.format('CSlotInfo:%s:%s:%s:%s:%s:%s:%s', company, tenant, resourceid, slotclass, type, category, slotid);
    redisHandler.GetObj_V(logKey, slotInfokey, function (err, obj, vid) {
        if (err) {
            console.log(err);
            callback(err, false);
        }
        else {
            var date = new Date();
            var tempObj = JSON.parse(obj);
            tempObj.State = "Reserved";
            tempObj.HandlingRequest = sessionid;
            tempObj.LastReservedTime = date.toISOString();
            tempObj.OtherInfo = otherInfo;
            var slotInfoTags = ["company_" + tempObj.Company, "tenant_" + tempObj.Tenant, "class_" + tempObj.Class, "type_" + tempObj.Type, "category_" + tempObj.Category, "state_" + tempObj.State, "resourceid_" + tempObj.ResourceId, "slotid_" + tempObj.SlotId, "handlingrequest_" + tempObj.HandlingRequest, "objtype_CSlotInfo"];
            var jsonObj = JSON.stringify(tempObj);
            redisHandler.SetObj_V_T(logKey, slotInfokey, jsonObj, slotInfoTags, vid, function (err, reply, vid) {
                infoLogger.DetailLogger.log('info', '%s Finished UpdateSlotStateReserved. Result: %s', logKey, reply);
                callback(err, reply);
            });
        }
    });
};

var UpdateSlotStateConnected = function (logKey, company, tenant, slotclass, type, category, resourceid, slotid, sessionid, otherInfo, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start UpdateSlotStateConnected *************************', logKey);

    var slotInfokey = util.format('CSlotInfo:%s:%s:%s:%s:%s:%s:%s', company, tenant, resourceid, slotclass, type, category, slotid);
    redisHandler.GetObj_V(logKey, slotInfokey, function (err, obj, vid) {
        if (err) {
            console.log(err);
            callback(err, false);
        }
        else {
            var tempObj = JSON.parse(obj);
            tempObj.State = "Connected";
            tempObj.HandlingRequest = sessionid;
            tempObj.OtherInfo = otherInfo;
            var slotInfoTags = ["company_" + tempObj.Company, "tenant_" + tempObj.Tenant, "class_" + tempObj.Class, "type_" + tempObj.Type, "category_" + tempObj.Category, "state_" + tempObj.State, "resourceid_" + tempObj.ResourceId, "slotid_" + tempObj.SlotId, "handlingrequest_" + tempObj.HandlingRequest, "objtype_CSlotInfo"];
            var jsonObj = JSON.stringify(tempObj);
            redisHandler.SetObj_V_T(logKey, slotInfokey, jsonObj, slotInfoTags, vid, function (err, reply, vid) {
                if (!err) {
                    UpdateLastConnectedTime(logKey, tempObj.Company, tempObj.Tenant, tempObj.Class, tempObj.Type, tempObj.Category, resourceid, function () { });
                }
                infoLogger.DetailLogger.log('info', '%s Finished UpdateSlotStateConnected. Result: %s', logKey, reply);
                callback(err, reply);
            });
        }
    });
};

var UpdateSlotStateBySessionId = function (logKey, company, tenant, slotclass, type, category, resourceid, sessionid, state, otherInfo, callback) {
    var slotInfoTags = [];

    if (resourceid == "") {
        slotInfoTags = ["company_" + company, "tenant_" + tenant, "class_" + slotclass, "type_" + type, "category_" + category, "handlingrequest_" + sessionid];
    }
    else {
        slotInfoTags = ["company_" + company, "tenant_" + tenant, "class_" + slotclass, "type_" + type, "category_" + category, "resourceid_" + resourceid, "handlingrequest_" + sessionid];
    }

    SearchCSlotByTags(logKey, slotInfoTags, function (err, cslots) {
        if (err) {
            console.log(err);
            callback(err, null);
        }
        else {
            if (cslots.length > 0) {
                for (var i in cslots) {
                    var cs = cslots[i].Obj;
                    if (cs.HandlingRequest == sessionid) {
                        switch (state) {
                            case "Available":
                                UpdateSlotStateAvailable(logKey, cs.Company, cs.Tenant, cs.Class, cs.Type, cs.Category, cs.ResourceId, cs.SlotId, otherInfo, function (err, result) {
                                    callback(err, result);
                                });
                                break;

                            case "Connected":
                                UpdateSlotStateConnected(logKey, cs.Company, cs.Tenant, cs.Class, cs.Type, cs.Category, cs.ResourceId, cs.SlotId, sessionid, otherInfo, function (err, result) {
                                    callback(err, result);
                                });
                                break;
                        }
                    }
                }
            }
            else {
                callback(err, "No Recerved Resource CSlot found for sessionId: " + sessionid);
            }
        }
    });
};

var SearchCSlotByTags = function (logKey, tags, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start SearchCSlotByTags *************************', logKey);

    if (Array.isArray(tags)) {
        tags.push("objtype_CSlotInfo");
        redisHandler.SearchObj_V_T(logKey, tags, function (err, result) {
            infoLogger.DetailLogger.log('info', '%s Finished SearchCSlotByTags. Result: %s', logKey, result);
            callback(err, result);
        });
    }
    else {
        var e = new Error();
        e.message = "tags must be a string array";
        infoLogger.DetailLogger.log('info', '%s Finished SearchCSlotByTags. Result: %s', logKey, "tags must be a string array");
        callback(e, null);
    }
};

var SearchConcurrencyInfoByTags = function (logKey, tags, callback) {
    infoLogger.DetailLogger.log('info', '%s ************************* Start SearchConcurrencyInfoByTags *************************', logKey);

    if (Array.isArray(tags)) {
        tags.push("objtype_ConcurrencyInfo");
        redisHandler.SearchObj_V_T(tags, function (err, result) {
            infoLogger.DetailLogger.log('info', '%s Finished SearchConcurrencyInfoByTags. Result: %s', logKey, result);
            callback(err, result);
        });
    }
    else {
        var e = new Error();
        e.message = "tags must be a string array";
        infoLogger.DetailLogger.log('info', '%s Finished SearchConcurrencyInfoByTags. Result: %s', logKey, "tags must be a string array");
        callback(e, null);
    }
};

var DoResourceSelection = function (company, tenant, sessionId, reqclass, reqtype, reqcategory, selectionAlgo, handlingAlgo, otherInfo, callback) {
    var params = util.format('/resourceselection/getresource/%d/%d/%s/%s/%s/%s/%s/%s/%s', company, tenant, sessionId, reqclass, reqtype, reqcategory, selectionAlgo, handlingAlgo, otherInfo);
    restClientHandler.DoGet(config.Services.resourceSelectionUrl, params, function (err, res, obj) {
        callback(err, res, obj);
    });
};

module.exports.AddResource = AddResource;
module.exports.SetResource = SetResource;
module.exports.RemoveResource = RemoveResource;
module.exports.GetResource = GetResource;
module.exports.SearchResourcebyTags = SearchResourcebyTags;

module.exports.UpdateLastConnectedTime = UpdateLastConnectedTime;
module.exports.UpdateSlotStateAvailable = UpdateSlotStateAvailable;
module.exports.UpdateSlotStateReserved = UpdateSlotStateReserved;
module.exports.UpdateSlotStateConnected = UpdateSlotStateConnected;
module.exports.UpdateSlotStateBySessionId = UpdateSlotStateBySessionId;
module.exports.SearchCSlotByTags = SearchCSlotByTags;
module.exports.SearchConcurrencyInfoByTags = SearchConcurrencyInfoByTags;

module.exports.DoResourceSelection = DoResourceSelection;