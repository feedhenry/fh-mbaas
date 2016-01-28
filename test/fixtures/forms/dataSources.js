
var services = require('../services');

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
    var self = this;

    ds.auditLogs = [{
      updateTimestamp: new Date(),
      serviceGuid: services.get().guid,
      endpoint: ds.endpoint,
      lastRefreshed: new Date(),
      data: self.dsDataSet(),
      dataHash: "123456",
      currentStatus: {
        status: "ok"
      }
    }];

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