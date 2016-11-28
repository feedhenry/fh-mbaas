var fhServiceAuth = require('fh-service-auth');
var _ = require('underscore');

function get(params, cb) {

  var serviceModel = fhServiceAuth.model.get(params.mongoUrl);
  serviceModel.findOne({
    guid: params.guid,
    domain: params.domain
  }, {lean: true}, cb);
}

function list(params, cb) {
  var serviceModel = fhServiceAuth.model.get(params.mongoUrl);
  serviceModel.find({
    domain: params.domain
  }, {lean: true}, cb);
}

function addDataSource(params, cb) {
  var serviceModel = fhServiceAuth.model.get(params.mongoUrl);

  if (!serviceModel) {
    return cb(new Error("No Service Model Defined For The Mongo Connection"));
  }

  serviceModel.updateDataSources({
    guid: params.guid,
    domain: params.domain,
    dataSourceIds: [params.dataSourceId],
    addDataSource: true
  }, function(err) {
    return cb(err);
  });
}

function removeDataSource(params, cb) {
  var serviceModel = fhServiceAuth.model.get(params.mongoUrl);

  if (!serviceModel) {
    return cb(new Error("No Service Model Defined For The Mongo Connection"));
  }

  serviceModel.removeDataSource({
    guid: params.guid,
    domain: params.domain,
    dataSourceIds: [params.dataSourceId]
  }, function(err) {
    return cb(err);
  });
}

function findServicesForDomain(params, cb) {
  var serviceModel = fhServiceAuth.model.get(params.mongoUrl);

  if (!serviceModel) {
    return cb(new Error("No Service Model Defined For The Mongo Connection"));
  }

  serviceModel.find({
    domain: params.domain
  }, cb);
}

//Updating The Service Entry In The Mbaas
function deploy(params, cb) {
  var serviceModel = fhServiceAuth.model.get(params.mongoUrl);

  if (!serviceModel) {
    return cb(new Error("No Service Model Defined For The Mongo Connection"));
  }

  serviceModel.findOneOrCreate({
    domain: params.domain,
    guid: params.service.guid
  }, params.service, function(err, serviceModel) {
    if (err) {
      return cb(err);
    }

    _.extendOwn(serviceModel, params.service);
    serviceModel.save(cb);
  });
}

function remove(params, cb) {
  var serviceModel = fhServiceAuth.model.get(params.mongoUrl);

  if (!serviceModel) {
    return cb(new Error("No Service Model Defined For The Mongo Connection"));
  }

  serviceModel.findOne({
    domain: params.domain,
    guid: params.guid
  }, function(err, service) {
    if (err) {
      return cb(err);
    }

    //Doesn't exist anyway. Not An Error
    if (!service) {
      return cb();
    }

    service.remove(cb);
  });
}



module.exports = {
  get: get,
  list: list,
  addDataSource: addDataSource,
  removeDataSource: removeDataSource,
  findServicesForDomain: findServicesForDomain,
  deploy: deploy,
  remove: remove
};