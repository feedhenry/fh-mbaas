var placeholders = {
  "openshift3": true,
  "crash_monitor.enabled": false,
  "fhamqp.enabled": false,
  "fhmbaas.port": 8080,
  "fhmbaas.key": "$(FHMBAAS_KEY)",
  "mongo.name": "$(MONGODB_FHMBAAS_DATABASE)",
  "mongo.host": "$(exec.dig mongodb-service A +search +short)",
  "mongo.auth.enabled": true,
  "mongo.auth.user": "$(MONGODB_FHMBAAS_USER)",
  "mongo.auth.pass": "$(MONGODB_FHMBAAS_PASSWORD)",
  "mongo.admin_auth.user": "admin",
  "mongo.admin_auth.pass": "$(MONGODB_ADMIN_PASSWORD)",
  "fhredis.host": "$(REDIS_SERVICE_SERVICE_HOST)",
  "fhredis.port": "$(REDIS_SERVICE_SERVICE_PORT)",
  "fhmetrics.host": "$(FH_METRICS_SERVICE_SERVICE_HOST)",
  "fhmetrics.port": "$(FH_METRICS_SERVICE_SERVICE_PORT)",
  "fhmetrics.apikey": "$(FH_METRICS_API_KEY)",
  "fhmessaging.host": "$(FH_MESSAGING_SERVICE_SERVICE_HOST)",
  "fhmessaging.port": "$(FH_MESSAGING_SERVICE_SERVICE_PORT)",
  "fhmessaging.apikey": "$(FH_MESSAGING_API_KEY)",
  "fhmessaging.realtime": true,
  "fhmessaging.cluster":"$(FH_CLUSTER)",
  "fhstats.host": "$(FH_STATSD_SERVICE_SERVICE_HOST)",
  "fhstats.port": "$(FH_STATSD_SERVICE_SERVICE_PORT)",
<<<<<<< HEAD
  "fhmbaas.mbaasid":"$(FH_MBAASID)",
  "auto_create_app_dbs":["openshift3"]
=======
  "fhstats.udp.port": "$(FH_STATSD_SERVICE_PORT_8081_UDP_PORT)",
  "fhstats.udp.protocol": "$(FH_STATSD_SERVICE_PORT_8081_UDP_PROTO)",
  "fhmbaas.mbaasid":"$(FH_MBAASID)",
  "email.smtp": "$(FH_EMAIL_SMTP)",
  "email.alert_email_from": "$(FH_EMAIL_ALERT_FROM)",
  "email.transport": "smtp"
>>>>>>> upstream/master
};

module.exports = placeholders;
