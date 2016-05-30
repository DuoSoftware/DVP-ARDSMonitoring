var restify = require('restify');
var util = require('util');
var uuid = require('node-uuid');
var requsetMonitor = require('./RequestMonitor.js');
var resourceMonitor = require('./ResourceMonitor.js');
var infoLogger = require('dvp-ardscommon/InformationLogger.js');
var authHandler = require('dvp-ardscommon/Authorization.js');
var config = require('config');
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var jwt = require('restify-jwt');
var secret = require('dvp-common/Authentication/Secret.js');
var authorization = require('dvp-common/Authentication/Authorization.js');

var redis = require('redis');

client1 = redis.createClient(config.Redis.redisport, config.Redis.redisip);
client1.auth(config.Redis.password);
client1.select(config.Redis.redisdb, redis.print);
//client.select(config.Redis.redisdb, function () { /* ... */ });
client1.on("error", function (err) {
    infoLogger.DetailLogger.log('error', 'Redis connection error :: %s', err);
    console.log("Error " + err);
});

client1.on("connect", function (err) {
    client1.select(8, redis.print);
});


var server = restify.createServer({
    name: 'ArdsMonitoringAPI',
    version: '1.0.0'
});
restify.CORS.ALLOW_HEADERS.push('authorization');
server.use(restify.CORS());
server.use(restify.fullResponse());
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(jwt({secret: secret.Secret}));

var hostIp = config.Host.Ip;
var hostPort = config.Host.Port;
var hostVersion = config.Host.Version;

server.get('/DVP/API/:version/ARDS/MONITORING/requests',authorization({resource:"request", action:"read"}), function (req, res, next) {
    try {
            var company = req.user.company;
            var tenant = req.user.tenant;
            var objkey = util.format('request-getall:company_%s:tenant_%s', company, tenant);
            var logkey = util.format('[%s]::[%s]', uuid.v1(), objkey);

            infoLogger.ReqResLogger.log('info', '%s --------------------------------------------------', logkey);
            infoLogger.ReqResLogger.log('info', '%s Start- request/getall #', logkey, {request: req.params});
            requsetMonitor.GetAllRequests(logkey, company, tenant, function (err, result) {
                if (err) {
                    infoLogger.ReqResLogger.log('error', '%s End- request/getall :: Error: %s #', logkey, err);
                    var jsonString = messageFormatter.FormatMessage(err, "ERROR", false, undefined);
                    res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
                    res.end(jsonString);
                }
                else {
                    infoLogger.ReqResLogger.log('info', '%s End- request/getall :: Result: %s #', logkey, 'success');
                    var jsonString = messageFormatter.FormatMessage(err, "get request success", true, result);
                    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
                    res.end(jsonString);
                }
            });
    } catch (ex2)
    {
        var jsonString = messageFormatter.FormatMessage(ex2, "ERROR", false, undefined);
        res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(jsonString);
    }
    return next();
});

server.get('/DVP/API/:version/ARDS/MONITORING/requests/:serverType/:requestType',authorization({resource:"read", action:"write"}), function (req, res, next) {
    try {
            var company = req.user.company;
            var tenant = req.user.tenant;
            var data = req.params;
            var objkey = util.format('request-filterBy_serverType_requestType:company_%s:tenant_%s:serverType_%s:requestType_%s', company, tenant, data["serverType"], data["requestType"]);
            var logkey = util.format('[%s]::[%s]', uuid.v1(), objkey);

            infoLogger.ReqResLogger.log('info', '%s --------------------------------------------------', logkey);
            infoLogger.ReqResLogger.log('info', '%s Start- request/getall #', logkey, {request: req.params});
            requsetMonitor.GetRequestFilterByClassTypeCategory(logkey, company, tenant, data["serverType"], data["requestType"], function (err, result) {
                if (err) {
                    infoLogger.ReqResLogger.log('error', '%s End- request/getall :: Error: %s #', logkey, err);
                    var jsonString = messageFormatter.FormatMessage(err, "ERROR", false, undefined);
                    res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
                    res.end(jsonString);
                }
                else {
                    infoLogger.ReqResLogger.log('info', '%s End- request/getall :: Result: %s #', logkey, 'success');
                    var jsonString = messageFormatter.FormatMessage(err, "get request success", true, result);
                    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
                    res.end(jsonString);
                }
            });
    } catch (ex2) {
        var jsonString = messageFormatter.FormatMessage(ex2, "ERROR", false, undefined);
        res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(jsonString);
    }
    return next();
});

server.get('/DVP/API/:version/ARDS/MONITORING/queues',authorization({resource:"queue", action:"read"}), function (req, res, next) {
    try {
            var company = req.user.company;
            var tenant = req.user.tenant;
            var objkey = util.format('request-getallQueueDetail:company_%s:tenant_%s', company, tenant);
            var logkey = util.format('[%s]::[%s]', uuid.v1(), objkey);

            infoLogger.ReqResLogger.log('info', '%s --------------------------------------------------', logkey);
            infoLogger.ReqResLogger.log('info', '%s Start- request/getall #', logkey, {request: req.params});
            requsetMonitor.GetAllQueueDetails(logkey, company, tenant, function (err, result) {
                if (err) {
                    infoLogger.ReqResLogger.log('error', '%s End- request/getall :: Error: %s #', logkey, err);
                    var jsonString = messageFormatter.FormatMessage(err, "ERROR", false, undefined);
                    res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
                    res.end(jsonString);
                }
                else {
                    infoLogger.ReqResLogger.log('info', '%s End- request/getall :: Result: %s #', logkey, 'success');
                    var jsonString = messageFormatter.FormatMessage(err, "get QueueInfo success", true, result);
                    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
                    res.end(jsonString);
                }
            });
    } catch (ex2) {
        var jsonString = messageFormatter.FormatMessage(ex2, "ERROR", false, undefined);
        res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(jsonString);
    }
    return next();
});

server.get('/DVP/API/:version/ARDS/MONITORING/queues/:serverType/:requestType',authorization({resource:"queue", action:"read"}), function (req, res, next) {
    try {
            var company = req.user.company;
            var tenant = req.user.tenant;
            var data = req.params;

            var objkey = util.format('queue-filterBysServerTyperRequestType:company_%s:tenant_%s:serverType_%s:requestType_%s', company, tenant, data["serverType"], data["requestType"]);
            var logkey = util.format('[%s]::[%s]', uuid.v1(), objkey);

            infoLogger.ReqResLogger.log('info', '%s --------------------------------------------------', logkey);
            infoLogger.ReqResLogger.log('info', '%s Start- request/getall #', logkey, {request: req.params});
            requsetMonitor.GetQueueDetailsFilterByClassTypeCategory(logkey, company, tenant, data["serverType"], data["requestType"], function (err, result) {
                if (err) {
                    infoLogger.ReqResLogger.log('error', '%s End- request/getall :: Error: %s #', logkey, err);
                    var jsonString = messageFormatter.FormatMessage(err, "ERROR", false, undefined);
                    res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
                    res.end(jsonString);
                }
                else {
                    infoLogger.ReqResLogger.log('info', '%s End- request/getall :: Result: %s #', logkey, 'success');
                    var jsonString = messageFormatter.FormatMessage(err, "get QueueInfo success", true, result);
                    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
                    res.end(jsonString);
                }
            });
    } catch (ex2) {
        var jsonString = messageFormatter.FormatMessage(ex2, "ERROR", false, undefined);
        res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(jsonString);
    }
    return next();
});


server.get('/DVP/API/:version/ARDS/MONITORING/resources',authorization({resource:"resource", action:"read"}), function (req, res, next) {
    try {
            var company = req.user.company;
            var tenant = req.user.tenant;
            var data = req.params;
            var objkey = util.format('resource-getall:company_%s:tenant_%s', company, tenant);
            var logkey = util.format('[%s]::[%s]', uuid.v1(), objkey);

            infoLogger.ReqResLogger.log('info', '%s --------------------------------------------------', logkey);
            infoLogger.ReqResLogger.log('info', '%s Start- resource/getall #', logkey, {request: req.params});
            resourceMonitor.GetAllResources(logkey, company, tenant, function (err, result) {
                if (err) {
                    infoLogger.ReqResLogger.log('error', '%s End- resource/getall :: Error: %s #', logkey, err);
                    var jsonString = messageFormatter.FormatMessage(err, "ERROR", false, undefined);
                    res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
                    res.end(jsonString);
                }
                else {
                    infoLogger.ReqResLogger.log('info', '%s End- resource/getall :: Result: %s #', logkey, 'success');
                    var jsonString = messageFormatter.FormatMessage(err, "get resources success", true, result);
                    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
                    res.end(jsonString);
                }
            });
    } catch (ex2) {
        var jsonString = messageFormatter.FormatMessage(ex2, "ERROR", false, undefined);
        res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(jsonString);
    }
    return next();
});

server.get('/DVP/API/:version/ARDS/MONITORING/resources/:class/:type/:category',authorization({resource:"resource", action:"read"}), function (req, res, next) {
    try {
            var company = req.user.company;
            var tenant = req.user.tenant;
            var data = req.params;
            var objkey = util.format('resource-filterByClassTypeCategory:company_%s:tenant_%s:class_%s:type_%s:category_%s', company, tenant, data["class"], data["type"], data["category"]);
            var logkey = util.format('[%s]::[%s]', uuid.v1(), objkey);

            infoLogger.ReqResLogger.log('info', '%s --------------------------------------------------', logkey);
            infoLogger.ReqResLogger.log('info', '%s Start- resource/getall #', logkey, {request: req.params});
            resourceMonitor.GetResourceFilterByClassTypeCategory(logkey, company, tenant, data["class"], data["type"], data["category"], function (err, result) {
                if (err) {
                    infoLogger.ReqResLogger.log('error', '%s End- resource/getall :: Error: %s #', logkey, err);
                    var jsonString = messageFormatter.FormatMessage(err, "ERROR", false, undefined);
                    res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
                    res.end(jsonString);
                }
                else {
                    infoLogger.ReqResLogger.log('info', '%s End- resource/getall :: Result: %s #', logkey, 'success');
                    var jsonString = messageFormatter.FormatMessage(err, "get resources success", true, result);
                    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
                    res.end(jsonString);
                }
            });
    } catch (ex2) {
        var jsonString = messageFormatter.FormatMessage(ex2, "ERROR", false, undefined);
        res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(jsonString);
    }
    return next();
});


server.get('/DashboardEvent/TotalCount/:window/:param1/:param2',authorization({resource:"resource", action:"read"}), function (req, res, next) {
    try {
        var company = req.user.company;
        var tenant = req.user.tenant;
        var data = req.params;

        var totalSearch = util.format("TOTALCOUNT:%d:%d:%s:%s:%s", tenant, company, data["window"], data["param1"], data["param2"]);
        client1.keys(totalSearch, function (err, replies) {
            if (err) {
                callback(err, replies);
            } else {
                console.log(replies.length + " replies:");
                if (replies.length > 0) {
                    var temptotal1 = 0;
                    var count = 0;
                    for(var i in replies){
                        client1.get(replies[i], function(err, result){
                            count++;
                            if(err){
                                console.log(err);
                            }else{
                               var count1= parseInt(result);
                                temptotal1 = temptotal1+ count1;
                            }
                            if(count == replies.length){
                                res.end(temptotal1.toString());
                            }
                        });
                    }
                } else {
                    res.end(0);
                }
            }
        });
    } catch (ex2) {
        var jsonString = messageFormatter.FormatMessage(ex2, "ERROR", false, undefined);
        res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(jsonString);
    }
    return next();
});


server.listen(hostPort, function () {
    console.log('%s listening at %s', server.name, server.url);
});