var winston = require('winston');
//var config = require('./Config.json');

var ReqResLogger = new (winston.Logger)({
    transports: [
        //new (winston.transports.Console)({
        //    colorize: true
        //}),
        new (winston.transports.File)({
            filename: 'ReqResLogger.log',
            level: 'debug',
            json: false,
            maxsize: 1024000,
            maxFiles: 10
        })
    ]
});

var DetailLogger = new (winston.Logger)({
    transports: [
        //new (winston.transports.Console)({
        //    colorize: true
        //}),
        new (winston.transports.File)({
            filename: 'DetailLogger.log',
            level: 'debug',
            json: false,
            maxsize: 1024000,
            maxFiles: 10
        })
    ]
});

var ContArdsLogger = new (winston.Logger)({
    transports: [
        //new (winston.transports.Console)({
        //    colorize: true
        //}),
        new (winston.transports.File)({
            filename: 'ContArdsLogger.log',
            level: 'debug',
            json: false,
            maxsize: 1024000,
            maxFiles: 10
        })
    ]
});

module.exports.ReqResLogger = ReqResLogger;
module.exports.DetailLogger = DetailLogger;
module.exports.ContArdsLogger = ContArdsLogger;