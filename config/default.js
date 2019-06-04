module.exports = {
    "Redis":
        {
            "mode":"sentinel",//instance, cluster, sentinel
            "ip": "45.55.142.207",
            "port": 6389,
            "user": "duo",
            "password": "DuoS123",
            "db":6,
            "sentinels":{
                "hosts": "138.197.90.92,45.55.205.92,138.197.90.92",
                "port":16389,
                "name":"redis-cluster"
            }

        },
    "Services" : {
        "accessToken":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdWtpdGhhIiwianRpIjoiYWEzOGRmZWYtNDFhOC00MWUyLTgwMzktOTJjZTY0YjM4ZDFmIiwic3ViIjoiNTZhOWU3NTlmYjA3MTkwN2EwMDAwMDAxMjVkOWU4MGI1YzdjNGY5ODQ2NmY5MjExNzk2ZWJmNDMiLCJleHAiOjE5MDIzODExMTgsInRlbmFudCI6LTEsImNvbXBhbnkiOi0xLCJzY29wZSI6W3sicmVzb3VyY2UiOiJhbGwiLCJhY3Rpb25zIjoiYWxsIn1dLCJpYXQiOjE0NzAzODExMTh9.Gmlu00Uj66Fzts-w6qEwNUz46XYGzE8wHUhAJOFtiRo",
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
        "notificationServiceVersion": "1.0.0.0"
    },
    "Host": {
        "Ip": "127.0.0.1",
        "Port": "2226",
        "Version": "1.0.0.0"
    },
    "DB": {
        "Type":"postgres",
        "User":"duo",
        "Password":"DuoS123",
        "Port":5432,
        "Host":"104.236.231.11",//104.131.105.222
        "Database":"duo"
    },
    "Security":
        {

            "ip" : "45.55.142.207",
            "port": 6389,
            "user": "duo",
            "password": "DuoS123",
            "mode":"sentinel",//instance, cluster, sentinel
            "sentinels":{
                "hosts": "138.197.90.92,45.55.205.92,138.197.90.92",
                "port":16389,
                "name":"redis-cluster"
            }
        },
    "RabbitMQ":
        {
            "ip": "45.55.142.207",
            "port": 5672,
            "user": "guest",
            "password": "guest",
            "vhost":'/'
        }
};