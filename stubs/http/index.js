// http module - browser uses fetch API instead
var EventEmitter = require('events');
function IncomingMessage() { EventEmitter.call(this); this.headers = {}; this.statusCode = 0; }
IncomingMessage.prototype = Object.create(EventEmitter.prototype);
function ClientRequest() { EventEmitter.call(this); }
ClientRequest.prototype = Object.create(EventEmitter.prototype);
ClientRequest.prototype.end = function() {};
ClientRequest.prototype.write = function() {};
ClientRequest.prototype.abort = function() {};
ClientRequest.prototype.destroy = function() {};

module.exports = {
  request: function(opts, cb) { return new ClientRequest(); },
  get: function(opts, cb) { return new ClientRequest(); },
  Agent: function() {},
  globalAgent: {},
  IncomingMessage: IncomingMessage,
  ClientRequest: ClientRequest,
  METHODS: ['GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS'],
  STATUS_CODES: {200:'OK',404:'Not Found'}
};
