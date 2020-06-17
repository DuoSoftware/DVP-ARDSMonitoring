module.exports = {
    "Redis":
        {
            "mode":"instace",//instance, cluster, sentinel
            "ip": "",
            "port": 6379,
            "user": "",
            "password": "",
            "db":6,
            "sentinels":{
                "hosts": "",
                "port":6379,
                "name":"redis-cluster"
            }

        },
    "Services" : {
        "accessToken":"",
        "routingServiceHost": "ardsliteroutingengine.104.131.67.21.xip.io",
        "routingServicePort": "2223",
        "routingServiceVersion": "1.0.0.0",
        "fileServiceHost": "fileservice.app1.veery.cloud",
        "fileServicePort": "2223",
        "fileServiceVersion": "1.0.0.0",
        "cdrServiceHost": "cdrprocessor.app1.veery.cloud",
        "cdrServicePort": "2223",
        "cdrServiceVersion": "1.0.0.0",
        "notificationServiceHost": "notificationservice.app1.veery.cloud",
        "notificationServicePort": "8089",
        "notificationServiceVersion": "1.0.0.0",
        "dynamicPort": true
    },
    "Host": {
        "Ip": "127.0.0.1",
        "Port": "2226",
        "Version": "1.0.0.0"
    },
    "DB": {
        "Type":"postgres",
        "User":"postgres",
        "Password":"",
        "Port":5432,
        "Host":"",//104.131.105.222
        "Database":"duo"
    },
    "Security":
        {

            "ip" : "",
            "port": 6379,
            "user": "duo",
            "password": "",
            "mode":"instance",//instance, cluster, sentinel
            "sentinels":{
                "hosts": "",
                "port":6379,
                "name":"redis-cluster"
            }
        },
    "RabbitMQ":
        {
            "ip": "",
            "port": 5672,
            "user": "",
            "password": "",
            "vhost":'/'
        }
};
