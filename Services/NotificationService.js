/**
 * Created by Heshan.i on 5/25/2017.
 */


var restClientHandler = require('./RestClient');
var util = require('util');
var config = require('config');
var validator = require('validator');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var dvpEventsHandler = require('../DVPEventsHandler.js');


function RequestToNotify(company, tenant, roomName, eventName, msgData){

    dvpEventsHandler.PublishToQueue('DVPEVENTS', msgData, company, tenant);

    try {
        var notificationUrl = util.format("http://%s/DVP/API/%s/NotificationService/Notification/initiate/%s", config.Services.notificationServiceHost, config.Services.notificationServiceVersion, roomName);
        if (validator.isIP(config.Services.notificationServiceHost)) {
            notificationUrl = util.format("http://%s:%s/DVP/API/%s/NotificationService/Notification/initiate/%s", config.Services.notificationServiceHost, config.Services.notificationServicePort, config.Services.notificationServiceVersion, roomName);
        }
        var companyInfo = util.format("%d:%d", tenant, company);
        restClientHandler.DoPostNotification(companyInfo, eventName, notificationUrl, msgData, function (err, res1, result) {
            if(err){
                logger.error('Do Post: Error:: '+err);

            }else{
                if(res1.statusCode === 200) {
                    logger.info('Do Post: Success');
                }else{
                    logger.info('Do Post: Failed');
                }
            }
        });
    }catch(ex){
        logger.error('Do Post: Error:: '+ex);
    }
}


module.exports.RequestToNotify = RequestToNotify;