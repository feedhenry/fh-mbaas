var supertest = require('supertest');
var proxyquire = require('proxyquire');
var fixtures = require('../../../fixtures');
var stubs = require('../../../stubs');
var express = require('express');
var assert = require('assert');
var util = require('util');
var fhConfig = require('fh-config');
fhConfig.setRawConfig(fixtures.config);
var logger = fhConfig.getLogger();
var sinon = require('sinon');
var bodyParser = require('body-parser');
var _ = require('underscore');

var baseRoutePath = '/:domain/:environment/appforms/data_sources';
var baseUrl = '/' + fixtures.mockDomain + '/' + fixtures.mockEnv + '/appforms/data_sources';

module.exports = {
  "It Should List Data Sources": function (done) {
    var mockDs = fixtures.forms.dataSources.get();
    var mockServiceDetails = fixtures.services.get();
    var dsListStub = stubs.forms.core.dataSources.list();

    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          dataSources: {
            list: dsListStub
          }
        }
      },
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger)
      }
    };

    var dsRouter = proxyquire('../../../../lib/routes/forms/dataSources/router.js', mocks);

    var app = express();

    app.use(function (req, res, next) {
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, dsRouter);

    supertest(app)
      .get(baseUrl + '/')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        assert.equal(res.body[0]._id, mockDs._id);
        assert.equal(res.body[0].serviceGuid, mockServiceDetails.guid);
      })
      .end(function (err) {
        if (err) {
          console.error(err);
        }
        assert.ok(!err, "Expected No Error " + util.inspect(err));

        assert.equal(1, dsListStub.callCount);

        done();
      });
  },
  "It Should Get A Single Data Source": function (done) {
    var mockDs = fixtures.forms.dataSources.get();
    var mockServiceDetails = fixtures.services.get();
    var dsGetStub = stubs.forms.core.dataSources.get();

    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          dataSources: {
            get: dsGetStub
          }
        }
      },
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger)
      }
    };

    var dsRouter = proxyquire('../../../../lib/routes/forms/dataSources/router.js', mocks);

    var app = express();

    app.use(function (req, res, next) {
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, dsRouter);

    supertest(app)
      .get(baseUrl + '/' + mockDs._id)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        assert.equal(res.body._id, mockDs._id);
        assert.equal(res.body.serviceGuid, mockServiceDetails.guid);
      })
      .end(function (err) {
        assert.ok(!err, "Expected No Error " + util.inspect(err));

        assert.equal(1, dsGetStub.callCount);

        done();
      });
  },
  "It Should Get A Single Data Source With Audit Logs": function (done) {
    var mockDSWithAuditLogs = fixtures.forms.dataSources.withAuditLogs();
    var mockServiceDetails = fixtures.services.get();
    var dsGetStub = stubs.forms.core.dataSources.get();

    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          dataSources: {
            get: dsGetStub
          }
        }
      },
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger)
      }
    };

    var dsRouter = proxyquire('../../../../lib/routes/forms/dataSources/router.js', mocks);

    var app = express();

    app.use(function (req, res, next) {
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, dsRouter);

    supertest(app)
      .get(baseUrl + '/' + mockDSWithAuditLogs._id + "/audit_logs")
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        assert.equal(res.body._id, mockDSWithAuditLogs._id);
        assert.equal(res.body.serviceGuid, mockServiceDetails.guid);
        assert.ok(res.body.auditLogs, "Expected Audit Logs");
      })
      .end(function (err) {
        assert.ok(!err, "Expected No Error " + util.inspect(err));

        sinon.assert.calledOnce(dsGetStub);

        done();
      });
  },
  "It Should Get A Single Audit Log Entry": function (done) {
    var mockAuditLog = fixtures.forms.dataSources.auditLog();
    var dsGetAuditLogEntryStub = stubs.forms.core.dataSources.getAuditLogEntry();

    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          dataSources: {
            getAuditLogEntry: dsGetAuditLogEntryStub
          }
        }
      },
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger)
      }
    };

    var dsRouter = proxyquire('../../../../lib/routes/forms/dataSources/router.js', mocks);

    var app = express();

    app.use(function (req, res, next) {
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, dsRouter);

    supertest(app)
      .get(baseUrl + '/audit_logs/' + mockAuditLog._id)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        assert.equal(res.body._id, mockAuditLog._id);
        assert.ok(res.body.data, "Expected a Data Response");
      })
      .end(function (err) {
        assert.ok(!err, "Expected No Error " + util.inspect(err));

        sinon.assert.calledOnce(dsGetAuditLogEntryStub);

        done();
      });
  },
  "It Should Deploy A Single Data Source": function (done) {
    var mockDs = fixtures.forms.dataSources.get();
    var mockServiceDetails = fixtures.services.get();
    var deploy = stubs.forms.core.dataSources.deploy();
    var mockUpdateDataSources = stubs.fhServiceAuth.model.updateDataSources();

    var mockGetDeployedService = stubs.services.appmbaas.getDeployedService();
    mockGetDeployedService['@global'] = true;
    var mockUpdateSingleDataSource = stubs.dataSourceUpdater.handlers.updateSingleDataSource();

    var dataSourceUpdaterModule = function () {
      return {
        handlers: {
          updateSingleDataSource: mockUpdateSingleDataSource
        }
      };
    };
    dataSourceUpdaterModule['@global'] = true;

    var mockServiceModel = stubs.fhServiceAuth.model.get({
      updateDataSources: mockUpdateDataSources
    });

    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          dataSources: {
            deploy: deploy
          }
        }
      },
      '../../../services/appmbaas/getDeployedService': mockGetDeployedService,
      'fh-service-auth': {
        '@global': true,
        model: {
          get: mockServiceModel
        }
      },
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger)
      },
      '../../../dataSourceUpdater': dataSourceUpdaterModule
    };

    var dsRouter = proxyquire('../../../../lib/routes/forms/dataSources/router.js', mocks);

    var app = express();

    app.use(bodyParser.json());

    app.use(function (req, res, next) {
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, dsRouter);

    supertest(app)
      .post(baseUrl + '/' + mockDs._id + "/deploy")
      .send(mockDs)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        assert.equal(res.body._id, mockDs._id);
        assert.equal(res.body.serviceGuid, mockServiceDetails.guid);
      })
      .end(function (err) {
        assert.ok(!err, "Expected No Error " + err);

        sinon.assert.calledOnce(deploy);
        sinon.assert.calledOnce(mockUpdateDataSources);
        sinon.assert.calledOnce(mockServiceModel);

        //These functions should be called after the deploy has responded.
        setTimeout(function(){
          sinon.assert.calledOnce(mockUpdateSingleDataSource);
          sinon.assert.calledOnce(mockGetDeployedService);
          done();
        }, 100);
      });
  },
  "It Should Deploy A Single Data Source No Service Deployed": function (done) {
    var mockDs = fixtures.forms.dataSources.get();
    var mockServiceDetails = fixtures.services.get();
    var deploy = stubs.forms.core.dataSources.deploy();
    var mockUpdateDataSources = stubs.fhServiceAuth.model.updateDataSources();

    var mockGetDeployedService = stubs.services.appmbaas.getDeployedService(true);
    mockGetDeployedService['@global'] = true;
    //Expecting an error update to the data source update function
    var mockUpdateSingleDataSource = stubs.dataSourceUpdater.handlers.updateSingleDataSource(true);

    var dataSourceUpdaterModule = function () {
      return {
        handlers: {
          updateSingleDataSource: mockUpdateSingleDataSource
        }
      };
    };
    dataSourceUpdaterModule['@global'] = true;

    var mockServiceModel = stubs.fhServiceAuth.model.get({
      updateDataSources: mockUpdateDataSources
    });

    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          dataSources: {
            deploy: deploy
          }
        }
      },
      '../../../services/appmbaas/getDeployedService': mockGetDeployedService,
      'fh-service-auth': {
        '@global': true,
        model: {
          get: mockServiceModel
        }
      },
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger)
      },
      '../../../dataSourceUpdater': dataSourceUpdaterModule
    };

    var dsRouter = proxyquire('../../../../lib/routes/forms/dataSources/router.js', mocks);

    var app = express();

    app.use(bodyParser.json());

    app.use(function (req, res, next) {
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, dsRouter);

    supertest(app)
      .post(baseUrl + '/' + mockDs._id + "/deploy")
      .send(mockDs)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        assert.equal(res.body._id, mockDs._id);
        assert.equal(res.body.serviceGuid, mockServiceDetails.guid);
      })
      .end(function (err) {
        assert.ok(!err, "Expected No Error " + err);

        sinon.assert.calledOnce(deploy);
        sinon.assert.calledOnce(mockUpdateDataSources);
        sinon.assert.calledOnce(mockServiceModel);

        //These functions should be called after the deploy has responded.
        setTimeout(function(){
          sinon.assert.calledOnce(mockUpdateSingleDataSource);
          sinon.assert.calledOnce(mockGetDeployedService);
          done();
        }, 100);
      });
  },
  "It Should Remove A Single Data Source": function (done) {
    var mockDs = fixtures.forms.dataSources.get();
    var dsRemoveStub = stubs.forms.core.dataSources.remove();
    var dsGetStub = stubs.forms.core.dataSources.get();
    var mockRemoveDSStub = stubs.fhServiceAuth.model.removeDataSource();
    var mockSericeModel = stubs.fhServiceAuth.model.get({
      removeDataSource: mockRemoveDSStub
    });

    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          dataSources: {
            remove: dsRemoveStub,
            get: dsGetStub
          }
        }
      },
      'fh-service-auth': {
        '@global': true,
        model: {
          get: mockSericeModel
        }
      },
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger)
      }
    };

    var dsRouter = proxyquire('../../../../lib/routes/forms/dataSources/router.js', mocks);

    var app = express();

    app.use(function (req, res, next) {
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, dsRouter);

    supertest(app)
      .delete(baseUrl + '/' + mockDs._id)
      .expect(204)
      .end(function (err) {
        assert.ok(!err, "Expected No Error " + util.inspect(err));

        assert.equal(1, dsRemoveStub.callCount);
        assert.equal(1, mockSericeModel.callCount);
        assert.equal(1, mockRemoveDSStub.callCount);
        assert.equal(1, dsGetStub.callCount);

        done();
      });
  },
  "It Should Force A Refresh Of A Single Data Source": function (done) {
    var mockDs = fixtures.forms.dataSources.withData();
    var mockServiceDetails = fixtures.services.get();
    var mockDSGet = stubs.forms.core.dataSources.get();
    var mockGetDeployedService = stubs.services.appmbaas.getDeployedService();
    mockGetDeployedService['@global'] = true;
    var mockUpdateSingleDataSource = stubs.dataSourceUpdater.handlers.updateSingleDataSource();

    var dataSourceUpdaterModule = function () {
      return {
        handlers: {
          updateSingleDataSource: mockUpdateSingleDataSource
        }
      };
    };
    dataSourceUpdaterModule['@global'] = true;


    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          dataSources: {
            get: mockDSGet
          }
        }
      },
      '../../../services/appmbaas/getDeployedService': mockGetDeployedService,
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger)
      },
      '../../../dataSourceUpdater': dataSourceUpdaterModule
    };

    var dsRouter = proxyquire('../../../../lib/routes/forms/dataSources/router.js', mocks);

    var app = express();

    app.use(bodyParser.json());

    app.use(function (req, res, next) {
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, dsRouter);

    supertest(app)
      .post(baseUrl + '/' + mockDs._id + "/refresh")
      .send(mockDs)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        assert.equal(res.body._id, mockDs._id);
        assert.equal(res.body.serviceGuid, mockServiceDetails.guid);
        assert.equal(res.body.currentStatus.status, 'ok');
      })
      .end(function (err) {
        assert.ok(!err, "Expected No Error " + err);

        sinon.assert.calledTwice(mockDSGet);
        sinon.assert.calledOnce(mockUpdateSingleDataSource);
        sinon.assert.calledOnce(mockGetDeployedService);

        done();
      });
  },
  "It Should Validate A Single Data Source": function (done) {

    var mockDs = fixtures.forms.dataSources.get();
    var mockServiceDetails = fixtures.services.get();
    var mockDSValidate = stubs.forms.core.dataSources.validate();
    var mockGetDeployedService = stubs.services.appmbaas.getDeployedService();
    mockGetDeployedService['@global'] = true;
    var mockRequestEndpointData = stubs.dataSourceUpdater.handlers.requestEndpointData();

    var dataSourceUpdaterModule = function () {
      return {
        handlers: {
          requestEndpointData: mockRequestEndpointData
        }
      };
    };
    dataSourceUpdaterModule['@global'] = true;

    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          dataSources: {
            validate: mockDSValidate
          }
        }
      },
      '../../../services/appmbaas/getDeployedService': mockGetDeployedService,
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger)
      },
      '../../../dataSourceUpdater': dataSourceUpdaterModule
    };

    var dsRouter = proxyquire('../../../../lib/routes/forms/dataSources/router.js', mocks);

    var app = express();

    app.use(bodyParser.json());

    app.use(function (req, res, next) {
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, dsRouter);

    supertest(app)
      .post(baseUrl + "/validate")
      .send(mockDs)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        assert.equal(res.body._id, mockDs._id);
        assert.equal(res.body.serviceGuid, mockServiceDetails.guid);
        assert.equal(res.body.validationResult.valid, true);
        assert.ok(res.body.data[0], "Expected A Data Set");
      })
      .end(function (err) {
        if (err) {
          logger.error(err);
        }
        assert.ok(!err, "Expected No Error " + err);

        sinon.assert.calledOnce(mockDSValidate);
        sinon.assert.calledOnce(mockRequestEndpointData);
        sinon.assert.calledOnce(mockGetDeployedService);

        done();
      });
  },
  "It Should Validate A Single Data Source No Deployed Service": function (done) {

    var mockDs = fixtures.forms.dataSources.get();
    var mockServiceDetails = fixtures.services.get();
    var mockDSValidate = stubs.forms.core.dataSources.validate();
    var mockGetDeployedService = stubs.services.appmbaas.getDeployedService(true);
    mockGetDeployedService['@global'] = true;
    var mockRequestEndpointData = stubs.dataSourceUpdater.handlers.requestEndpointData();

    var dataSourceUpdaterModule = function () {
      return {
        handlers: {
          requestEndpointData: mockRequestEndpointData
        }
      };
    };
    dataSourceUpdaterModule['@global'] = true;

    var mocks = {
      'fh-forms': {
        '@global': true,
        core: {
          dataSources: {
            validate: mockDSValidate
          }
        }
      },
      '../../../services/appmbaas/getDeployedService': mockGetDeployedService,
      'fh-config': {
        '@global': true,
        getLogger: sinon.stub().returns(logger)
      },
      '../../../dataSourceUpdater': dataSourceUpdaterModule
    };

    var dsRouter = proxyquire('../../../../lib/routes/forms/dataSources/router.js', mocks);

    var app = express();

    app.use(bodyParser.json());

    app.use(function (req, res, next) {
      req.mongoUrl = fixtures.mockMongoUrl;
      next();
    });

    app.use(baseRoutePath, dsRouter);

    supertest(app)
      .post(baseUrl + "/validate")
      .send(mockDs)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(function (res) {
        assert.equal(res.body._id, mockDs._id);
        assert.equal(res.body.serviceGuid, mockServiceDetails.guid);
        assert.equal(res.body.validationResult.valid, false);
        assert.ok(res.body.validationResult.message.indexOf("deployed") > -1);
        assert.ok(!res.body.data, "Expected NO Data Set");
      })
      .end(function (err) {
        if (err) {
          logger.error(err);
        }
        assert.ok(!err, "Expected No Error " + err);

        sinon.assert.notCalled(mockDSValidate);
        sinon.assert.notCalled(mockRequestEndpointData);
        sinon.assert.calledOnce(mockGetDeployedService);

        done();
      });
  }
};
