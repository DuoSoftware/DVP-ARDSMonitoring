var stringify = require('stringify');

var FormatMessage = function(exception, customMessage, isSuccess, resultObj)
{
    var Exception = null;
    if(exception)
    {
        Exception = {
            Message : exception.message,
            StackTrace : exception.stack
        };
    }

    var result = {
        Exception : Exception,
        CustomMessage : customMessage,
        IsSuccess : isSuccess,
        Result : resultObj
    };

    return JSON.stringify(result);
};

module.exports.FormatMessage = FormatMessage;