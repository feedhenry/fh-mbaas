
var services = require('../services');
var _ = require('underscore');

module.exports = {
  get: function(){
    return {
      _id: "somedatasource",
      name: "Some Data Source",
      serviceGuid: services.get().guid,
      endpoint: "/someendpoint"
    };
  },
  withData: function(){
    var ds = this.get();

    ds.currentStatus = {
      status: "ok"
    };
    ds.data = this.dsDataSet();

    return ds;
  },
  withAuditLogs: function(){
    var ds = this.withData();

    ds.auditLogs = [{
      updateTimestamp: new Date(),
      serviceGuid: services.get().guid,
      endpoint: ds.endpoint,
      lastRefreshed: new Date(),
      data: this.dsDataSet(),
      dataHash: "123456",
      currentStatus: {
        status: "ok"
      }
    }];

    return ds;
  },
  auditLog: function(){
    var ds = this.get();
    return {
      _id: "someauditlogid",
      dataSource: ds._id,
      updateTimestamp: new Date(),
      serviceGuid: services.get().guid,
      endpoint: ds.endpoint,
      data: this.dsDataSet(),
      lastRefreshed: new Date(),
      dataHash: "123456",
      currentStatus: {
        status: "ok"
      }
    };
  },
  withAuditLogsNoData: function(){
    var ds = this.withData();

    ds.auditLogs = [_.omit(this.auditLog(), 'data')];

    return ds;
  },
  dsDataSet: function(){
    return [{
      key: "dskey1",
      value: "DS Value 1",
      selected: false
    },{
      key: "dskey2",
      value: "DS Value 2",
      selected: true
    }];
  },
  withError: function(){
    var ds = this.get();

    ds.currentStatus = {
      status: "error",
      error: {
        code: "DS_ERROR",
        userDetail: "Data Source Error",
        systemDetail: "Data Source System Data"
      }
    };

    return ds;
  }
};
