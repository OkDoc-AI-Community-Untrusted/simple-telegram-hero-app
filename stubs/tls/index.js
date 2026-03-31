// tls module - not available in browser, HTTPS is handled natively
var net = require('net');
module.exports = {
  connect: function(opts, cb) { var s = new net.Socket(); if (cb) setTimeout(cb, 0); return s; },
  createSecureContext: function() { return {}; },
  TLSSocket: net.Socket,
  DEFAULT_MIN_VERSION: 'TLSv1.2',
  DEFAULT_MAX_VERSION: 'TLSv1.3'
};
