// net module - not available in browser, GramJS uses WebSockets instead
var EventEmitter = require('events');
function Socket() {
  EventEmitter.call(this);
  this.writable = false;
  this.readable = false;
}
Socket.prototype = Object.create(EventEmitter.prototype);
Socket.prototype.connect = function() { this.emit('error', new Error('net.Socket not available in browser')); return this; };
Socket.prototype.write = function() { return false; };
Socket.prototype.end = function() {};
Socket.prototype.destroy = function() {};
Socket.prototype.setKeepAlive = function() { return this; };
Socket.prototype.setNoDelay = function() { return this; };
Socket.prototype.setTimeout = function() { return this; };
Socket.prototype.ref = function() { return this; };
Socket.prototype.unref = function() { return this; };

module.exports = {
  Socket: Socket,
  createConnection: function() { return new Socket(); },
  connect: function() { return new Socket(); },
  createServer: function() { throw new Error('net.createServer not available in browser'); },
  isIP: function(input) { return 0; },
  isIPv4: function() { return false; },
  isIPv6: function() { return false; }
};
