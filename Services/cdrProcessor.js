/**
 * Created by Heshan.i on 2/3/2017.
 */

var restClientHandler = require('./RestClient');
var util = require('util');
var config = require('config');
var validator = require('validator');

function GetCdrBySessions(company, tenant, sessionIds, callback){
    try {
        var httpUrl = util.format('http://%s/DVP/API/%s/CallCDR/GetCallDetailsBySessions', config.Services.cdrServiceHost, config.Services.cdrServiceVersion);

        if(config.Services.dynamicPort || validator.isIP(config.Services.cdrServiceHost))
        {
            httpUrl = util.format('http://%s:%s/DVP/API/%s/FileService/File/%s/MetaData', config.Services.cdrServiceHost, config.Services.cdrServicePort, config.Services.cdrServiceVersion);
        }

        var companyInfo = util.format("%d:%d", tenant, company);
        restClientHandler.DoPost(companyInfo, httpUrl, sessionIds, function (err, res1, result) {
            if(err){
                callback(err, undefined);
            }else{
                if(res1.statusCode === 200) {
                    callback(undefined, JSON.parse(result));
                }else{
                    callback(new Error(result), undefined);
                }
            }
        });
    }catch(ex){
        callback(ex, undefined);
    }
}


module.exports.GetCdrBySessions = GetCdrBySessions;