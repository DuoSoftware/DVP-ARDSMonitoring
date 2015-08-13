var redis = require('redis');
var util = require('util');
var EventEmiter = require('events').EventEmitter;
var config = require('config');
var infoLogger = require('./InformationLogger.js');

client = redis.createClient(6379, config.Redis.redisip);
client.select(config.Redis.redisdb, redis.print);
//client.select(config.Redis.redisdb, function () { /* ... */ });
client.on("error", function (err) {
    infoLogger.DetailLogger.log('error', 'Redis connection error :: %s', err);
    console.log("Error " + err);
});

client.on("connect", function (err) {
    client.select(config.Redis.redisdb, redis.print);
});

var lock = require("redis-lock")(client);


var SetTags = function (logKey, tagKey, objKey, callback) {
    var tagMeta = util.format('tagMeta:%s', objKey);
    
    //infoLogger.DetailLogger.log('info', '..................................................');
    infoLogger.DetailLogger.log('info', '%s SetTags - objkey: %s :: tagkey: %s :: tagMetakey: %s', logKey, objKey, tagKey, tagMeta);

    client.get(tagMeta, function (err, result) {
        if (err) {
            infoLogger.DetailLogger.log('error', '%s SetTags Get tag meta - Error: %s', logKey, err);
            console.log(err);
            callback(err, null);
        } else {
            infoLogger.DetailLogger.log('debug', '%s SetTags Get tag meta - Result: %s', logKey, result || "Not found.");
            if (result == null) {
                client.set(tagKey, objKey, function (err, reply) {
                    if (err) {
                        infoLogger.DetailLogger.log('error', '%s SetTags Set new tag - Error: %s', logKey, err);
                        console.log(err);
                        callback(err, null);
                    }
                    else {
                        infoLogger.DetailLogger.log('info', '%s SetTags Set new tag success. - Result: %s', logKey, reply);
                                
                        client.set(tagMeta, tagKey, function (err, reply) {
                            if (err) {
                                infoLogger.DetailLogger.log('error', '%s SetTags Set tag meta - Error: %s', logKey, err);
                                client.del(tagKey, function (err, reply) {
                                });
                                callback(err, reply);
                            }
                            else {
                                infoLogger.DetailLogger.log('debug', '%s SetTags Set tag meta success.', logKey);
                                callback(err, reply);
                            }
                        });
                    }
                });
            }
            else {
                client.del(result, function (err, reply) {
                    if (err) {
                        infoLogger.DetailLogger.log('error', '%s SetTags Delete old tag - Error: %s', logKey, err);
                        console.log(error);
                        callback(err, null)
                    }
                    else if (reply === 1) {
                        infoLogger.DetailLogger.log('debug', '%s SetTags Delete old tag success.', logKey);
                                
                        client.set(tagKey, objKey, function (err, reply) {
                            if (err) {
                                infoLogger.DetailLogger.log('error', '%s SetTags Set new tag - Error: %s', logKey, err);
                                console.log(err);
                            }
                            else {
                                infoLogger.DetailLogger.log('info', '%s SetTags Set new tag success. - Result: %s', logKey, reply);
                        
                                client.set(tagMeta, tagKey, function (err, reply) {
                                    if (err) {
                                        infoLogger.DetailLogger.log('error', '%s SetTags Set tag meta - Error: %s', logKey, err);
                                
                                        client.del(tagKey, function (err, reply) {
                                        });
                                        
                                        callback(err, reply);
                                    }
                                    else {
                                        infoLogger.DetailLogger.log('debug', '%s SetTags Set tag meta success.', logKey);
                                
                                        callback(err, reply);
                                    }
                                });
                            }
                        });
                    }
                    else {
                        infoLogger.DetailLogger.log('debug', '%s SetTags Delete old tag failed.', logKey);
                        console.log("del failed" + result);
                        callback(null, "Failed");
                    }
                });
            }            
        }
    });
};

var SetObj = function (logKey, key, obj, callback) {
    lock(key, 500, function (done) {
        infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
        infoLogger.DetailLogger.log('info', '%s SetObj - key: %s :: obj: %s', logKey, key, obj);

        client.set(key, obj, function (error, reply) {
            done();
            if (error) {
                infoLogger.DetailLogger.log('error', '%s SetObj - key: %s :: Error: %s', logKey, key, error);
                callback(error, null);
            }
            else {
                infoLogger.DetailLogger.log('info', '%s SetObj - key: %s :: Reply: %s', logKey, key, reply);
                callback(null, reply);
            }
        });
    });
};

var RemoveObj = function (logKey, key, callback) {
    //var lockKey = util.format('%s', key.split(":").join(""));
    lock(key, 500, function (done) {
        infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
        infoLogger.DetailLogger.log('info', '%s RemoveObj - key: %s', logKey, key);

        client.del(key, function (err, reply) {
            done();
            if (err) {
                infoLogger.DetailLogger.log('error', '%s RemoveObj - key: %s :: Error: %s', logKey, key, err);
                console.log(error);
            }
            else if (reply === 1) {
                infoLogger.DetailLogger.log('info', '%s RemoveObj - key: %s :: Reply: %s', logKey, key, reply);
                callback(null, "true");
            }
            else {
                infoLogger.DetailLogger.log('info', '%s RemoveObj - key: %s :: Reply: %s', logKey, key, reply);
                callback(null, "false");
            }
        });
    });
};

var GetObj = function (logKey, key, callback) {
    infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
    infoLogger.DetailLogger.log('info', '%s GetObj - key: %s', logKey, key);

    client.get(key, function (err, result) {
        if (err) {
            infoLogger.DetailLogger.log('error', '%s GetObj - key: %s :: Error: %s', logKey, key, err);
            console.log(err);
            callback(err, null);
        } else {
            infoLogger.DetailLogger.log('info', '%s GetObj - key: %s :: Reply: %s', logKey, key, result);
            callback(null, result);
        }
    });
};


var AddObj_T = function (logKey, key, obj, tags, callback) {
    //var lockKey = util.format('%s', key.split(":").join(""));
    lock(key, 500, function (done) {
        infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
        infoLogger.DetailLogger.log('info', '%s AddObj_T - key: %s :: obj: %s', logKey, key, obj);

        var vid = 1;
        if (Array.isArray(tags)) {
            var tagkey = util.format('tag:%s', tags.join(":"));
            
            SetTags(logKey,tagkey, key, function (err, reply) {
                if (err) {
                    done();
                    console.log(error);
                }
                else if (reply === "OK") {
                    client.set(key, obj, function (error, reply) {
                        done();
                        if (error) {
                            infoLogger.DetailLogger.log('error', '%s AddObj_T Error - key: %s :: Error: %s', logKey, key, error);
                            console.log(error);
                            client.del(tagkey, function (err, reply) {
                            });
                            client.del(versionkey, function (err, reply) {
                            });
                        }
                        else {
                            infoLogger.DetailLogger.log('info', '%s AddObj_T Success - key: %s', logKey, key);
                            callback(null, reply);
                        }
                    });
                }
            });
        }
    });
};

var SetObj_T = function (logKey, key, obj, tags, callback) {
    //var lockKey = util.format('%s', key.split(":").join(""));
    lock(key, 500, function (done) {
        infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
        infoLogger.DetailLogger.log('info', '%s SetObj_T - key: %s :: obj: %s', logKey, key, obj);

        if (Array.isArray(tags)) {
            var tagkey = util.format('tag:%s', tags.join(":"));
            SetTags(logKey, tagkey, key, function (err, reply) {
                if (err) {
                    done();
                    console.log(error);
                }
                else if (reply === "OK") {
                    client.set(key, obj, function (error, reply) {
                        done();
                        if (error) {
                            infoLogger.DetailLogger.log('error', '%s SetObj_T Error - key: %s :: Error: %s', logKey, key, error);
                            console.log(error);
                        }
                        else {
                            infoLogger.DetailLogger.log('info', '%s SetObj_T Success - key: %s', logKey, key);
                            callback(null, reply);
                        }
                    });
                }
            });
        }
    });
};

var RemoveObj_T = function (logKey, key, tags, callback) {
    //var lockKey = util.format('%s', key.split(":").join(""));
    lock(key, 500, function (done) {
        infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
        infoLogger.DetailLogger.log('info', '%s RemoveObj_T - key: %s', logKey, key);

        if (Array.isArray(tags)) {
            var tagMeta = util.format('tagMeta:%s', key);
            client.get(tagMeta, function (err, result) {
                if (err) {
                    infoLogger.DetailLogger.log('error', '%s RemoveObj_T Remove tag Error - key: %s :: Error: %s', logKey, key, err);
                    console.log(err);
                } else {
                    client.del(result, function (err, reply) { });
                    client.del(tagMeta, function (err, reply) { });
                    infoLogger.DetailLogger.log('info', '%s RemoveObj_T Remove tag success - key: %s :: tagkey: %s', logKey, key, result);
                }
            });
        
        }
        
        client.del(key, function (err, reply) {
            done();
            if (err) {
                infoLogger.DetailLogger.log('error', '%s RemoveObj_T Error - key: %s :: Error: %s', logKey, key, err);
                console.log(err);
            }
            else if (reply === 1) {
                infoLogger.DetailLogger.log('info', '%s RemoveObj_T Success - key: %s', logKey, key);
                callback(null, "true");
            }
            else {
                infoLogger.DetailLogger.log('info', '%s RemoveObj_T Failed - key: %s', logKey, key);
                callback(null, "false");
            }
        });
    });
};

var GetObjByTagKey_T = function (logKey, tagKeys) {
    var e = new EventEmiter();
    var count = 0;
    for (var i in tagKeys) {
        var val = tagKeys[i];
        //console.log("    " + i + ": " + val);
        client.get(val, function (err, key) {
            console.log("Key: " + key);
            
            GetObj(logKey, key, function (err, obj) {
                e.emit('result', err, obj);
                count++;
                
                console.log("res", count);
                
                if (tagKeys.length === count) {
                    console.log("end", count);
                    e.emit('end');
                }
            });
        });
    }
    return (e);
};

var SearchObj_T = function (logKey, tags, callback) {
    var result = [];
    var searchKey = util.format('tag:*%s*', tags.join("*"));
    
    client.keys(searchKey, function (err, replies) {
        if (err) {
            callback(err, result);
        } else {
            console.log(replies.length + " replies:");
            if (replies.length > 0) {
                var gobtk = GetObjByTagKey_T(logKey, replies);

                gobtk.on('result', function (err, obj) {
                    var obj = JSON.parse(obj);
                    result.push(obj);
                });

                gobtk.on('end', function () {
                    callback(null, result);
                });
            } else {
                callback(null, result);
            }
        }
    });
};


var AddObj_V = function (logKey, key, obj, callback) {
    //var lockKey = util.format('%s', key.split(":").join(""));
    lock(key, 500, function (done) {
        infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
        infoLogger.DetailLogger.log('info', '%s AddObj_V - key: %s :: obj: %s', logKey, key, obj);

        var vid = 1;
        var versionkey = util.format('version:%s', key);
        client.set(versionkey, vid, function (err, reply) {
            if (err) {
                infoLogger.DetailLogger.log('error', '%s AddObj_V SetVersion Error - key: %s :: Error: %s', logKey, key, err);
                            
                done();
                console.log(error);
                callback(err, "SetVersion Failed", vid);
            }
            else if (reply === "OK") {
                client.set(key, obj, function (error, reply) {
                    done();
                    if (error) {
                        console.log(error);
                        client.del(tagkey, function (err, reply) {
                        });
                        client.del(versionkey, function (err, reply) {
                        });
                        
                        infoLogger.DetailLogger.log('error', '%s AddObj_V Error - key: %s :: Error: %s', logKey, key, error);
                        callback(error, "AddObj_V Failed", vid);
                    }
                    else {
                        infoLogger.DetailLogger.log('info', '%s AddObj_V Success - key: %s', logKey, key);
                        callback(null, reply, vid);
                    }
                });
            }
        });
    });    
};

var SetObj_V = function (logKey, key, obj, cvid, callback) {
    //var lockKey = util.format('%s', key.split(":").join(""));
    lock(key, 500, function (done) {
        infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
        infoLogger.DetailLogger.log('info', '%s SetObj_V - key: %s :: obj: %s :: cvid: %s', logKey, key, obj, cvid);

        var versionkey = util.format('version:%s', key);
        client.get(versionkey, function (err, reply) {
            if (err) {
                infoLogger.DetailLogger.log('error', '%s SetObj_V GetVersion Error - key: %s :: Error: %s', logKey, key, err);
                done();
                console.log(err);
            }
            else if (reply === null) {
                done();
                AddObj_V(key, obj, callback);
            }
            else if (reply === cvid) {
                var versionkey = util.format('version:%s', key);
                client.incr(versionkey, function (err, reply) {
                    if (err) {
                        infoLogger.DetailLogger.log('error', '%s SetObj_V SetVersion Error - key: %s :: Error: %s', logKey, key, err);
                        done();
                        console.log(error);
                    }
                    else {
                        var vid = reply
                        client.set(key, obj, function (error, reply) {
                            done();
                            if (error) {
                                infoLogger.DetailLogger.log('error', '%s SetObj_V Error - key: %s :: Error: %s', logKey, key, error);
                                console.log(error);
                                callback(error, reply, vid);
                            }
                            else {
                                infoLogger.DetailLogger.log('info', '%s SetObj_V Success - key: %s', logKey, key);
                                callback(null, reply, vid);
                            }
                        });
                    }
                });
            }
            else {
                infoLogger.DetailLogger.log('info', '%s SetObj_V VERSION_MISMATCHED - key: %s :: cvid: %s', logKey, key, cvid);
                callback(null, "VERSION_MISMATCHED", cvid);
            }
        });
    });
};

var RemoveObj_V = function (logKey, key, callback) {
    //var lockKey = util.format('%s', key.split(":").join(""));
    lock(key, 500, function (done) {
        infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
        infoLogger.DetailLogger.log('info', '%s RemoveObj_V - key: %s', logKey, key);

        var versionkey = util.format('version:%s', key);
        client.del(versionkey, function (err, reply) { });
        
        client.del(key, function (err, reply) {
            done();
            if (err) {
                infoLogger.DetailLogger.log('error', '%s RemoveObj_V - key: %s :: Error: %s', logKey, key, err);
                console.log(error);
            }
            else if (reply === 1) {
                infoLogger.DetailLogger.log('info', '%s RemoveObj_V - key: %s :: Reply: %s', logKey, key, reply);
                callback(null, "true");
            }
            else {
                infoLogger.DetailLogger.log('info', '%s RemoveObj_V - key: %s :: Reply: %s', logKey, key, reply);
                callback(null, "false");
            }
        });
    });
};

var GetObj_V = function (logKey, key, callback) {
    infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
    infoLogger.DetailLogger.log('info', '%s GetObj_V - key: %s', logKey, key);

    client.get(key, function (err, result) {
        if (err) {
            infoLogger.DetailLogger.log('error', 'GetObj_V - key: %s :: Error: %s', key, err);
            console.log(err);
            callback(err, null, 0);
        } else {
            var versionkey = util.format('version:%s', key);
            client.get(versionkey, function (err, vresult) {
                if (err) {
                    console.log(err);
                    callback(err, null, 0);
                } else {
                    infoLogger.DetailLogger.log('info', 'GetObj_V - key: %s :: Reply: %s :: vid:%s', key, result, vresult);
                    callback(null, result, vresult);
                }
            });
        }
    });
};


var AddObj_V_T = function (logKey, key, obj, tags, callback) {
    //var lockKey = util.format('%s', key.split(":").join(""));
    lock(key, 500, function (done) {
        infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
        infoLogger.DetailLogger.log('info', '%s AddObj_V_T - key: %s :: obj: %s', logKey, key, obj);

        var vid = 1;
        if (Array.isArray(tags)) {
            var tagkey = util.format('tag:%s', tags.join(":"));
            SetTags(logKey, tagkey, key, function (err, reply) {
                if (err) {
                    done();
                    console.log(error);
                }
                else if (reply === "OK") {
                    var versionkey = util.format('version:%s', key);
                    client.set(versionkey, vid, function (err, reply) {
                        if (err) {
                            infoLogger.DetailLogger.log('error', '%s AddObj_V_T SetVersion Error - key: %s :: Error: %s', logKey, key, err);
                            done();
                            console.log(error);
                            client.del(tagkey, function (err, reply) {
                            });
                        }
                        else if (reply === "OK") {
                            client.set(key, obj, function (error, reply) {
                                done();
                                if (error) {
                                    infoLogger.DetailLogger.log('error', '%s AddObj_V_T Error - key: %s :: Error: %s', logKey, key, error);
                                    console.log(error);
                                    client.del(tagkey, function (err, reply) {
                                    });
                                    client.del(versionkey, function (err, reply) {
                                    });
                                }
                                else {
                                    infoLogger.DetailLogger.log('info', '%s AddObj_V_T Success - key: %s', logKey, key);
                                    callback(null, reply, vid);
                                }
                            });
                        }
                    });
                }
            });
        }
    });
};

var SetObj_V_T = function (logKey, key, obj, tags, cvid, callback) {
    //var lockKey = util.format('%s', key.split(":").join(""));
    lock(key, 500, function (done) {
        infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
        infoLogger.DetailLogger.log('info', '%s SetObj_V_T - key: %s :: obj: %s :: cvid: %s', logKey, key, obj, cvid);

        var versionkey = util.format('version:%s', key);
        client.get(versionkey, function (err, reply) {
            if (err) {
                infoLogger.DetailLogger.log('error', '%s SetObj_V_T GetVersion Error - key: %s :: Error: %s', logKey, key, err);
                done();
                console.log(err);
            }
            else if (reply === null) {
                done();
                AddObj_V_T(key, obj, tags, callback);
            }
            else if (reply === cvid) {
                if (Array.isArray(tags)) {
                    var tagkey = util.format('tag:%s', tags.join(":"));
                    SetTags(logKey, tagkey, key, function (err, reply) {
                        if (err) {
                            done();
                            console.log(error);
                        }
                        else if (reply === "OK") {
                            var versionkey = util.format('version:%s', key);
                            client.incr(versionkey, function (err, reply) {
                                if (err) {
                                    infoLogger.DetailLogger.log('error', '%s SetObj_V_T SetVersion Error - key: %s :: Error: %s', logKey, key, err);
                                    done();
                                    console.log(error);
                                }
                                else {
                                    var vid = reply
                                    client.set(key, obj, function (error, reply) {
                                        done();
                                        if (error) {
                                            infoLogger.DetailLogger.log('error', '%s SetObj_V_T Error - key: %s :: Error: %s', logKey, key, error);
                                            console.log(error);
                                        }
                                        else {
                                            infoLogger.DetailLogger.log('info', '%s SetObj_V_T Success - key: %s', logKey, key);
                                            callback(null, reply, vid);
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            }
            else {
                infoLogger.DetailLogger.log('info', '%s SetObj_V VERSION_MISMATCHED - key: %s :: cvid: %s', logKey, key, cvid);
                done();
                callback(null, "VERSION_MISMATCHED", cvid);
            }
        });
    });
};

var RemoveObj_V_T = function (logKey, key, tags, callback) {
    //var lockKey = util.format('%s', key.split(":").join(""));
    lock(key, 500, function (done) {
        infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
        infoLogger.DetailLogger.log('info', '%s RemoveObj_V_T - key: %s', logKey, key);

        if (Array.isArray(tags)) {
            var tagMeta = util.format('tagMeta:%s', key);
            client.get(tagMeta, function (err, result) {
                if (err) {
                    console.log(err);
                } else {
                    client.del(result, function (err, reply) { });
                    client.del(tagMeta, function (err, reply) { });
                }
            });
        }
        
        var versionkey = util.format('version:%s', key);
        client.del(versionkey, function (err, reply) { });
        
        client.del(key, function (err, reply) {
            done();
            if (err) {
                infoLogger.DetailLogger.log('error', '%s RemoveObj_V_T - key: %s :: Error: %s', logKey, key, err);
                console.log(error);
                callback(err, "false");
            }
            else if (reply === 1) {
                infoLogger.DetailLogger.log('info', '%s RemoveObj_V_T - key: %s :: Reply: %s', logKey, key, reply);
                callback(null, "true");
            }
            else {
                infoLogger.DetailLogger.log('info', '%s RemoveObj_V_T - key: %s :: Reply: %s', logKey, key, reply);
                callback(null, "false");
            }
        });
    });
};

var GetObjByTagKey_V_T = function (logKey, tagKeys) {
    var e = new EventEmiter();
    var count = 0;
    for (var i in tagKeys) {
        var val = tagKeys[i];
        console.log("    " + i + ": " + val);
        client.get(val, function (err, key) {
            console.log("Key: " + key);
            
            GetObj_V(logKey, key, function (err, obj, vid) {
                e.emit('result', err, obj, vid);
                count++;
                
                console.log("res", count);
                
                if (tagKeys.length === count) {
                    console.log("end", count);
                    e.emit('end');
                }
            });
        });
    }
    return (e);
};

var SearchObj_V_T = function (logKey, tags, callback) {
    var result = [];
    var searchKey = util.format('tag:*%s*', tags.join("*"));
    
    client.keys(searchKey, function (err, replies) {
        console.log(replies.length + " replies:");
        if (replies.length > 0) {
            var gobtk = GetObjByTagKey_V_T(logKey, replies);
            
            gobtk.on('result', function (err, obj, vid) {
                var obj = { Obj: JSON.parse(obj), Vid: JSON.parse(vid) };
                result.push(obj);
            });
            
            gobtk.on('end', function () {
                callback(null, result);
            });
        }
        else {
            callback(null, result);
        }

    });
};


var CheckObjExists = function (logKey, key, callback) {
    infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
    infoLogger.DetailLogger.log('info', '%s CheckObjExists - key: %s', logKey, key);

    client.exists(key, function (error, reply) {
        if (error) {
            infoLogger.DetailLogger.log('error', '%s CheckObjExists Error - key: %s :: Error: %s', logKey, key, error);
            callback(error, null);
        }
        else {
            infoLogger.DetailLogger.log('info', '%s CheckObjExists - key: %s :: Reply: %s', logKey, key, reply);
            callback(null, reply);
        }
    });
};


var AddItemToListR = function (logKey, key, obj, callback) {
    infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
    infoLogger.DetailLogger.log('info', '%s AddItemToListR - key: %s :: obj: %s', logKey, key, obj);

    client.rpush(key, obj, function (error, reply) {
        if (error) {
            infoLogger.DetailLogger.log('error', '%s AddItemToListR Error - key: %s :: Error: %s', logKey, key, error);
            callback(error, null);
        }
        else {
            infoLogger.DetailLogger.log('info', '%s AddItemToListR - key: %s :: Reply: %s', logKey, key, reply);
            callback(null, reply);
        }
    });
};

var AddItemToListL = function (logKey, key, obj, callback) {
    infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
    infoLogger.DetailLogger.log('info', '%s AddItemToListL - key: %s :: obj: %s', logKey, key, obj);

    client.lpush(key, obj, function (error, reply) {
        if (error) {
            infoLogger.DetailLogger.log('error', '%s AddItemToListL Error - key: %s :: Error: %s', logKey, key, error);
            callback(error, null);
        }
        else {
            infoLogger.DetailLogger.log('info', '%s AddItemToListL - key: %s :: Reply: %s', logKey, key, reply);
            callback(null, reply);
        }
    });
};

var GetItemFromList = function (logKey, key, callback) {
    infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
    infoLogger.DetailLogger.log('info', '%s GetItemFromList - key: %s', logKey, key);

    client.lpop(key, function (err, result) {
        if (err) {
            infoLogger.DetailLogger.log('error', '%s GetItemFromList Error - key: %s :: Error: %s', logKey, key, error);
            console.log(err);
            callback(err, null);
        } else {
            infoLogger.DetailLogger.log('info', '%s GetItemFromList - key: %s :: Reply: %s', logKey, key, result);
            callback(null, result);
        }
    });
};

var RemoveItemFromList = function (logKey, key, obj, callback) {
    infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
    infoLogger.DetailLogger.log('info', '%s RemoveItemFromList - key: %s :: obj: %s', logKey, key, obj);

    client.lrem(key, 0, obj, function (err, result) {
        if (err) {
            infoLogger.DetailLogger.log('error', '%s RemoveItemFromList Error - key: %s :: Error: %s', logKey, key, err);
            console.log(err);
            callback(err, null);
        } else {
            infoLogger.DetailLogger.log('info', '%s RemoveItemFromList - key: %s :: Reply: %d', logKey, key, result);
            callback(null, result);
        }
    });
};


var AddItemToHash = function (logKey, hashKey, field, obj, callback) {
    infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
    infoLogger.DetailLogger.log('info', '%s AddItemToHash - hashKey: %s :: field: %s :: obj: %s', logKey, hashKey, field, obj);

    client.hset(hashKey, field, obj, function (err, result) {
        if (err) {
            infoLogger.DetailLogger.log('error', '%s AddItemToHash Error - hashKey: %s :: field: %s  :: Error: %s', logKey, hashKey, field, err);
            console.log(err);
            callback(err, null);
        } else {
            infoLogger.DetailLogger.log('info', '%s AddItemToHash - hashKey: %s :: field: %s  :: Reply: %s', logKey, hashKey, field, result);
            callback(null, result);
        }
    });
};

var RemoveItemFromHash = function (logKey, hashKey, field, callback) {
    infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
    infoLogger.DetailLogger.log('info', '%s RemoveItemFromHash - hashKey: %s :: field: %s', logKey, hashKey, field);

    client.hdel(hashKey, field, function (err, result) {
        if (err) {
            infoLogger.DetailLogger.log('error', '%s RemoveItemFromHash Error - hashKey: %s :: field: %s  :: Error: %s', logKey, hashKey, field, err);
            console.log(err);
            callback(err, null);
        } else {
            infoLogger.DetailLogger.log('info', '%s RemoveItemFromHash - hashKey: %s :: field: %s  :: Reply: %s', logKey, hashKey, field, result);
            callback(null, result);
        }
    });
};

var RemoveHash = function (logKey, hashKey, callback) {
    infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
    infoLogger.DetailLogger.log('info', '%s RemoveHash - hashKey: %s', logKey, hashKey);

    client.del(hashKey, function (err, result) {
        if (err) {
            infoLogger.DetailLogger.log('error', '%s RemoveHash Error - hashKey: %s :: Error: %s', logKey, hashKey, err);
            console.log(err);
            callback(err, null);
        } else {
            infoLogger.DetailLogger.log('info', '%s RemoveHash - hashKey: %s :: Reply: %s', logKey, hashKey, result);
            callback(null, result);
        }
    });
};

var CheckHashFieldExists = function (logKey, hashkey, field, callback) {
    infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
    infoLogger.DetailLogger.log('info', '%s CheckHashFieldExists - hashKey: %s :: field: %s', logKey, hashkey, field);

    client.hexists(hashkey, field, function (err, result) {
        if (err) {
            infoLogger.DetailLogger.log('error', '%s CheckHashFieldExists Error - hashKey: %s :: field: %s  :: Error: %s', logKey, hashkey, field, err);
            console.log(err);
            callback(err, null);
        } else {
            infoLogger.DetailLogger.log('info', '%s CheckHashFieldExists - hashKey: %s :: field: %s  :: Reply: %s', logKey, hashkey, field, result);
            callback(null, result);
        }
    });
};

var GetHashValue = function(logKey, hashkey, field, callback) {
    infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
    infoLogger.DetailLogger.log('info', '%S GetHashValue - hashKey: %s :: field: %s', logKey, hashKey, field);

    client.hexists(hashKey, field, function (err, result) {
        if (err) {
            infoLogger.DetailLogger.log('error', '%s GetHashValue Error - hashKey: %s :: field: %s  :: Error: %s', logKey, hashKey, field, err);
            console.log(err);
            callback(err, null);
        } else {
            infoLogger.DetailLogger.log('info', '%s GetHashValue - hashKey: %s :: field: %s  :: Reply: %s', logKey, hashKey, field, result);
            callback(null, result);
        }
    });
};

var GetAllHashValue = function (logKey, hashkey, callback) {
    infoLogger.DetailLogger.log('info', '%s --------------------------------------------------', logKey);
    infoLogger.DetailLogger.log('info', '%s GetAllHashValue - hashKey: %s', logKey, hashKey);

    client.hvals(hashKey, function (err, result) {
        if (err) {
            infoLogger.DetailLogger.log('error', '%s GetAllHashValue Error - hashKey: %s :: Error: %s', logKey, hashKey, err);
            console.log(err);
            callback(err, null);
        } else {
            infoLogger.DetailLogger.log('info', '%s GetAllHashValue - hashKey: %s :: Reply: %s', logKey, hashKey, result);
            callback(null, result);
        }
    });
};

module.exports.SetObj = SetObj;
module.exports.RemoveObj = RemoveObj;
module.exports.GetObj = GetObj;

module.exports.AddObj_T = AddObj_T;
module.exports.SetObj_T = SetObj_T;
module.exports.RemoveObj_T = RemoveObj_T;
module.exports.SearchObj_T = SearchObj_T;

module.exports.AddObj_V = AddObj_V;
module.exports.SetObj_V = SetObj_V;
module.exports.RemoveObj_V = RemoveObj_V;
module.exports.GetObj_V = GetObj_V;

module.exports.AddObj_V_T = AddObj_V_T;
module.exports.SetObj_V_T = SetObj_V_T;
module.exports.RemoveObj_V_T = RemoveObj_V_T;
module.exports.SearchObj_V_T = SearchObj_V_T;

module.exports.CheckObjExists = CheckObjExists;

module.exports.AddItemToListR = AddItemToListR;
module.exports.AddItemToListL = AddItemToListL;
module.exports.GetItemFromList = GetItemFromList;
module.exports.RemoveItemFromList = RemoveItemFromList;

module.exports.AddItemToHash = AddItemToHash;
module.exports.RemoveItemFromHash = RemoveItemFromHash;
module.exports.CheckHashFieldExists = CheckHashFieldExists;
module.exports.GetHashValue = GetHashValue;
module.exports.GetAllHashValue = GetAllHashValue;
module.exports.RemoveHash = RemoveHash;