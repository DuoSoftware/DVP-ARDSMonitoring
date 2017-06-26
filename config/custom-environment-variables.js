module.exports = {
	"Redis":{
		"redisip":"SYS_REDIS_HOST",
		"redisport":"SYS_REDIS_PORT",
		"password":"SYS_REDIS_PASSWORD",
		"redisdb":"SYS_REDIS_DB_ARDS"
	},
	"Services" : {
		"accessToken": "HOST_TOKEN",
		"routingServiceHost": "SYS_ARDSLITEROUTINGENGINE_HOST",
		"routingServicePort": "SYS_ARDSLITEROUTINGENGINE_PORT",
		"routingServiceVersion": "SYS_ARDSLITEROUTINGENGINE_VERSION",
		"fileServiceHost": "SYS_FILESERVICE_HOST",
		"fileServicePort": "SYS_FILESERVICE_PORT",
		"fileServiceVersion": "SYS_FILESERVICE_VERSION",
		"cdrServiceHost": "SYS_CDRPROCESSOR_HOST",
		"cdrServicePort": "SYS_CDRPROCESSOR_PORT",
		"cdrServiceVersion": "SYS_CDRPROCESSOR_VERSION",
		"notificationServiceHost": "SYS_NOTIFICATIONSERVICE_HOST",
		"notificationServicePort": "SYS_NOTIFICATIONSERVICE_PORT",
		"notificationServiceVersion": "SYS_NOTIFICATIONSERVICE_VERSION"
	},
	"Host": {
		"Port": "HOST_ARDSMONITOR_PORT",
		"Version": "HOST_VERSION"
	},
	"DB": {
		"Type": "SYS_DATABASE_TYPE",
		"User": "SYS_DATABASE_POSTGRES_USER",
		"Password": "SYS_DATABASE_POSTGRES_PASSWORD",
		"Port": "SYS_SQL_PORT",
		"Host": "SYS_DATABASE_HOST",
		"Database": "SYS_DATABASE_POSTGRES_USER"
	},
	"Security":
	{
		"ip": "SYS_REDIS_HOST",
		"port": "SYS_REDIS_PORT",
		"user": "SYS_REDIS_USER",
		"password": "SYS_REDIS_PASSWORD"
	},
	"RabbitMQ":
	{
		"ip": "SYS_RABBITMQ_HOST",
		"port": "SYS_RABBITMQ_PORT",
		"user": "SYS_RABBITMQ_USER",
		"password": "SYS_RABBITMQ_PASSWORD"
	}
};
