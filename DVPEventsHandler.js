var config = require('config');
var amqp = require('amqp');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;

var ips = [];

if(config.RabbitMQ.ip) {
    ips = config.RabbitMQ.ip.split(",");
}


var queueConnection = amqp.createConnection({
    //url: queueHost,
    host: ips,
    port: config.RabbitMQ.port,
    login: config.RabbitMQ.user,
    password: config.RabbitMQ.password,
    vhost: config.RabbitMQ.vhost,
    noDelay: true,
    heartbeat:10
}, {
    reconnect: true,
    reconnectBackoffStrategy: 'linear',
    reconnectExponentialLimit: 120000,
    reconnectBackoffTime: 1000
});

queueConnection.on('ready', function () {

    logger.info("Conection with the queue is OK");
});

queueConnection.on('error', function (error) {

    logger.info("There is an error" + error);
});

module.exports.PublishToQueue = function(messageType, sendObj, companyId, tenantId) {

    console.log('SEND DVP EVENTS : ' + JSON.stringify(sendObj));

    try {
        var date = new Date();
        var evtData =
            {
                SessionId: null,
                EventName: 'StatusChange',
                CompanyId: companyId,
                TenantId: tenantId,
                EventClass: "AGENT",
                EventType: "STATUS",
                EventCategory: sendObj.message.slotState.toUpperCase(),
                EventTime: date.toISOString(),
                EventData: "",
                EventParams: "",
                EventSpecificData: {
                    EventType: sendObj.message.slotState.toUpperCase(),
                    Mode: sendObj.message.slotMode.toUpperCase(),
                    ResourceId: sendObj.message.resourceId,
                    Resource: sendObj.message.userName,
                    Timestamp: date.valueOf(),
                    BusinessUnit: sendObj.message.businessUnit
                },
                BusinessUnit: sendObj.message.businessUnit
            };

        queueConnection.publish(messageType, evtData, {
            contentType: 'application/json'
        });

    } catch (exp) {

        console.log(exp);
    }
};

