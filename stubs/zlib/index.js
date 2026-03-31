// zlib module - browser alternative
var noop = function() {};
var passthrough = function(buf, cb) { if (cb) cb(null, buf); return buf; };
module.exports = {
  deflate: passthrough,
  deflateSync: function(buf) { return buf; },
  inflate: passthrough,
  inflateSync: function(buf) { return buf; },
  gzip: passthrough,
  gzipSync: function(buf) { return buf; },
  gunzip: passthrough,
  gunzipSync: function(buf) { return buf; },
  createGzip: noop,
  createGunzip: noop,
  createDeflate: noop,
  createInflate: noop
};
