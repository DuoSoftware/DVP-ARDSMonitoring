var dbModel = require('../../DVP-DBModels');
var sequelize = dbModel.SequelizeConn;

var deleteNetworkProfile = function(profileId, callback)
{
    try
    {
        dbModel.SipNetworkProfile.find({where: [{id: profileId}]}).complete(function (err, profRec)
        {
            if (!err && profRec)
            {
                profRec.delete().complete(function (err, result)
                {
                    if(!err)
                    {
                        callback(undefined, true);
                    }
                    else
                    {
                        callback(err, false);
                    }
                });
            }
            else
            {
                callback(undefined, false);
            }

        })
    }
    catch(ex)
    {
        callback(ex, false);
    }
}


var addNetworkProfileToCallServer = function(profileId, callServerId, callback)
{
    try
    {
        dbModel.CallServer.find({where: [{id: callServerId}]}).complete(function (err, csRec)
        {
            if (!err && csRec)
            {
                dbModel.SipNetworkProfile.find({where: [{id: profileId}]}).complete(function (err, profRec)
                {
                    if (!err && profRec)
                    {
                        csRec.addSipNetworkProfile(profRec).complete(function (err, result)
                        {
                            if(!err)
                            {
                                callback(undefined,profRec, true);
                            }
                            else
                            {
                                callback(err,undefined, true);
                            }

                        })
                    }
                    else
                    {
                        callback(undefined,undefined, false);
                    }

                })

            }
            else
            {
                callback(undefined,undefined, false);
            }})
    }
    catch(ex)
    {
        callback(ex,undefined, false);
    }
}


var addNetworkProfiletoEndUser = function(profileid, enduserid, callback){

    try
    {
        dbModel.SipNetworkProfile.find({where: [{id: profileid}]}).complete(function (err, nw)
        {
            if (!err && nw)
            {
                dbModel.CloudEndUser.find({where: [{id: enduserid}]}).complete(function (err, user)
                {
                    if (!err && user )
                    {
                        user.setSipNetworkProfile(nw).complete(function (err, result)
                        {
                            if(!err)
                            {
                                callback(undefined, undefined,true);
                            }
                            else
                            {
                                callback(err, nw,true);
                            }

                        })
                    }
                    else
                    {
                        callback(undefined, undefined,false);
                    }

                })

            }
            else
            {
                callback(undefined,undefined, false);
            }})
    }
    catch(ex)
    {
        callback(ex,undefined, false);
    }

}

var addSipNetworkProfile = function(profileInfo, callback)
{
    try {

        var profile = dbModel.SipNetworkProfile.build({
            ProfileName: profileInfo.ProfileName,
            MainIp: profileInfo.MainIp,
            InternalIp: profileInfo.InternalIp,
            InternalRtpIp: profileInfo.InternalRtpIp,
            ExternalIp: profileInfo.ExternalIp,
            ExternalRtpIp: profileInfo.ExternalRtpIp,
            Port: profileInfo.Port,
            ObjClass: profileInfo.ObjClass,
            ObjType: profileInfo.ObjType,
            ObjCategory: profileInfo.ObjCategory,
            CompanyId: profileInfo.CompanyId,
            TenantId: profileInfo.TenantId
        });



        dbModel.IPAddress.find({where: [{IP: profileInfo.InternalIp}]}).complete(function (err, ipAddress) {

            if(ipAddress && ipAddress.IsAllocated){

                profile
                    .save()
                    .complete(function (err) {
                        try {
                            if (!!err) {
                                callback(err, -1, false);
                            }
                            else {

                                var profId = profile.id;
                                callback(undefined, profId, true);
                            }
                        }
                        catch (ex) {
                            callback(ex,-1, false);
                        }

                    })



            }else{

                callback(new Error("IP not found"), -1, false);

            }

        });

    }
    catch(ex)
    {
        callback(ex, -1, false);
    }
};

module.exports.deleteNetworkProfile = deleteNetworkProfile;
module.exports.addNetworkProfileToCallServer = addNetworkProfileToCallServer;
module.exports.addSipNetworkProfile = addSipNetworkProfile;
module.exports.addNetworkProfiletoEndUser= addNetworkProfiletoEndUser;
