
var services = require('../services');

module.exports = {
  get: function(){
    return {
      _id: "somedatasource",
      name: "Some Data Source",
      serviceGuid: services.get().guid
    };
  }
};