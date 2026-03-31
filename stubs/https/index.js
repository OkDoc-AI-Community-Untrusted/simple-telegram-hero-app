// https module - browser uses fetch API instead
var http = require('http');
module.exports = {
  request: http.request,
  get: http.get,
  Agent: http.Agent,
  globalAgent: {}
};
