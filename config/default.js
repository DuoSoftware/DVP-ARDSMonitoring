module.exports = {
	"Redis":
	{
		"mode":"sentinel",//instance, cluster, sentinel
		"ip": "",
		"port": 6389,
		"user": "",
		"password": "",
		"db":6,
		"sentinels":{
			"hosts": "",
			"port":16389,
			"name":"redis-cluster"
		}

	},
	"Services" : {
		"accessToken":"",
		"routingServiceHost": "",
		"routingServicePort": "2223",
		"routingServiceVersion": "1.0.0.0",
		"fileServiceHost": "",
		"fileServicePort": "2223",
		"fileServiceVersion": "1.0.0.0",
		"cdrServiceHost": "",
		"cdrServicePort": "2223",
		"cdrServiceVersion": "1.0.0.0",
		"notificationServiceHost": "",
		"notificationServicePort": "8089",
		"notificationServiceVersion": "1.0.0.0"
	},
	"Host": {
		"Ip": "127.0.0.1",
		"Port": "2225",
		"Version": "1.0.0.0"
	},
	"DB": {
		"Type":"postgres",
		"User":"",
		"Password":"",
		"Port":5432,
		"Host":"",
		"Database":""
	},
	"Security":
	{

		"ip" : "",
		"port": 6389,
		"user": "",
		"password": "",
		"mode":"sentinel",//instance, cluster, sentinel
		"sentinels":{
			"hosts": "",
			"port":16389,
			"name":"redis-cluster"
		}
	},
	"RabbitMQ":
	{
		"ip": "",
		"port": 5672,
		"user": "",
		"password": ""
	}
};
