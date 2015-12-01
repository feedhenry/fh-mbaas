var placeholders = {
  "crash_monitor.enabled": false,
  "fhamqp.enabled": false,
  "fhmbaas.port": 8080,
  "fhmbaas.key": "$(FHMBAAS_KEY)",
  "mongo.name": "$(MONGODB_FHMBAAS_DATABASE)",
  "mongo.host": "$(exec.dig mongodb-service A +search +short)",
  "mongo.auth.enabled": true,
  "mongo.auth.user": "$(MONGODB_FHMBAAS_USER)",
  "mongo.auth.pass": "$(MONGODB_FHMBAAS_PASSWORD)",
  "mongo.admin_auth.pass": "$(MONGODB_ADMIN_PASSWORD)",
  "fhredis.host": "$(REDIS_SERVICE_SERVICE_HOST)"
}

module.exports = placeholders;
