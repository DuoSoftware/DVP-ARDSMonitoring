/**
 * Created by Heshan.i on 2/3/2017.
 */

var restClientHandler = require('./RestClient');
var util = require('util');
var config = require('config');
var validator = require('validator');
var fs = require('fs');

function GetFileMetadata(company, tenant, filename, callback){
    try {
        var httpUrl = util.format('http://%s/DVP/API/%s/FileService/File/%s/MetaData', config.Services.fileServiceHost, config.Services.fileServiceVersion, filename);

        if(validator.isIP(config.Services.fileServiceHost))
        {
            httpUrl = util.format('http://%s:%s/DVP/API/%s/FileService/File/%s/MetaData', config.Services.fileServiceHost, config.Services.fileServicePort, config.Services.fileServiceVersion, filename);
        }

        var companyInfo = util.format("%d:%d", tenant, company);
        restClientHandler.DoGet(companyInfo, httpUrl, function (err, res1, result) {
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

function FileUploadReserve(company, tenant, filename, callback){
    try {
        var httpUrl = util.format('http://%s/DVP/API/%s/FileService/File/Reserve', config.Services.fileServiceHost, config.Services.fileServiceVersion);

        if(validator.isIP(config.Services.fileServiceHost))
        {
            httpUrl = util.format('http://%s:%s/DVP/API/%s/FileService/File/Reserve', config.Services.fileServiceHost, config.Services.fileServicePort, config.Services.fileServiceVersion);
        }

        var reqBody = {class: 'MISSEDCALL', fileCategory:'REPORTS', display: filename, filename: filename};

        var companyInfo = util.format("%d:%d", tenant, company);
        restClientHandler.DoPost(companyInfo, httpUrl, reqBody, function (err, res1, result) {
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

function UploadFile(company, tenant, uniqueId, formData, callback){
    try {
        var httpUrl = util.format('http://%s/DVP/API/%s/FileService/File/Upload', config.Services.fileServiceHost, config.Services.fileServiceVersion);

        if(validator.isIP(config.Services.fileServiceHost))
        {
            httpUrl = util.format('http://%s:%s/DVP/API/%s/FileService/File/Upload', config.Services.fileServiceHost, config.Services.fileServicePort, config.Services.fileServiceVersion);
        }



        if(uniqueId)
        {
            formData.reservedId = uniqueId
        }

        var companyInfo = util.format("%d:%d", tenant, company);
        restClientHandler.DoPostFormData(companyInfo, httpUrl, formData, function (err, res1, result) {
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

function DeleteFile(company, tenant, uniqueId, callback){
    try {
        var httpUrl = util.format('http://%s/DVP/API/%s/FileService/File/%s', config.Services.fileServiceHost, config.Services.fileServiceVersion, uniqueId);

        if(validator.isIP(config.Services.fileServiceHost))
        {
            httpUrl = util.format('http://%s:%s/DVP/API/%s/FileService/File/%s', config.Services.fileServiceHost, config.Services.fileServicePort, config.Services.fileServiceVersion, uniqueId);
        }

        var companyInfo = util.format("%d:%d", tenant, company);
        restClientHandler.DoDelete(companyInfo, httpUrl, function (err, res1, result) {
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


module.exports.GetFileMetadata = GetFileMetadata;
module.exports.FileUploadReserve = FileUploadReserve;
module.exports.UploadFile = UploadFile;
module.exports.DeleteFile = DeleteFile;
