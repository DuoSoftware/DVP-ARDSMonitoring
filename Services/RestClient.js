/**
 * Created by Heshan.i on 2/3/2017.
 */


var request = require('request');
var util = require('util');
var config = require('config');

var DoPost = function (companyInfo, serviceurl, postData, callback) {

    var jsonStr = JSON.stringify(postData);
    var accessToken = util.format("bearer %s", config.Services.accessToken);

    var options = {
        url: serviceurl,
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'authorization': accessToken,
            'companyinfo': companyInfo
        },
        body: jsonStr
    };

    try {
        request.post(options, function optionalCallback(err, httpResponse, body) {
            if (err) {
                console.log('upload failed:', err);
            }
            console.log('Server returned: %j', body);
            callback(err, httpResponse, body);
        });
    }catch(ex){
        callback(ex, undefined, undefined);
    }

};

var DoPostFormData = function (companyInfo, serviceurl, formData, callback) {

    var accessToken = util.format("bearer %s", config.Services.accessToken);

    var options = {
        url: serviceurl,
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'authorization': accessToken,
            'companyinfo': companyInfo
        },
        formData: formData
    };

    try {
        request.post(options, function optionalCallback(err, httpResponse, body) {
            if (err) {
                console.log('upload failed:', err);
            }
            console.log('Server returned: %j', body);
            callback(err, httpResponse, body);
        });
    }catch(ex){
        callback(ex, undefined, undefined);
    }

};

var DoGet = function (companyInfo, serviceurl, callback) {

    var accessToken = util.format("bearer %s", config.Services.accessToken);
    console.log('RouteRequest:: %s', serviceurl);

    var options = {
        url: serviceurl,
        method: 'GET',
        headers: {
            'content-type': 'application/json',
            'authorization': accessToken,
            'companyinfo': companyInfo
        }
    };

    try {
        request(options, function optionalCallback(err, httpResponse, body) {
            if (err) {
                console.log('upload failed:', err);
            }
            console.log('Server returned: %j', body);
            callback(err, httpResponse, body);
        });
    }catch(ex){
        callback(ex, undefined, undefined);
    }

};

var DoDelete = function (companyInfo, serviceurl, callback) {

    var accessToken = util.format("bearer %s", config.Services.accessToken);
    console.log('RouteRequest:: %s', serviceurl);

    var options = {
        url: serviceurl,
        method: 'DELETE',
        headers: {
            'content-type': 'application/json',
            'authorization': accessToken,
            'companyinfo': companyInfo
        }
    };

    try {
        request(options, function optionalCallback(err, httpResponse, body) {
            if (err) {
                console.log('upload failed:', err);
            }
            console.log('Server returned: %j', body);
            callback(err, httpResponse, body);
        });
    }catch(ex){
        callback(ex, undefined, undefined);
    }

};

function DoPostNotification (companyInfo, eventName, serviceurl, postData, callback) {
    var jsonStr = JSON.stringify(postData);
    var accessToken = util.format("bearer %s", config.Services.accessToken);
    var options = {
        url: serviceurl,
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'authorization': accessToken,
            'companyinfo': companyInfo,
            'eventname': eventName
        },
        body: jsonStr
    };
    try {
        request.post(options, function optionalCallback(err, httpResponse, body) {
            if (err) {
                console.log('upload failed:', err);
            }
            console.log('Server returned: %j', body);
            callback(err, httpResponse, body);
        });
    }catch(ex){
        callback(ex, undefined, undefined);
    }
}

module.exports.DoPost = DoPost;
module.exports.DoGet = DoGet;
module.exports.DoDelete = DoDelete;
module.exports.DoPostFormData = DoPostFormData;
module.exports.DoPostNotification = DoPostNotification;