var noop = function() {};
module.exports = {
  lookup: function(hostname, opts, cb) { if (typeof opts === 'function') { cb = opts; } if (cb) cb(null, hostname, 4); },
  resolve: function(hostname, rrtype, cb) { if (typeof rrtype === 'function') { cb = rrtype; } if (cb) cb(null, []); },
  resolve4: function(hostname, cb) { if (cb) cb(null, []); },
  resolve6: function(hostname, cb) { if (cb) cb(null, []); },
  promises: { lookup: function() { return Promise.resolve({ address: '127.0.0.1', family: 4 }); }, resolve: function() { return Promise.resolve([]); } }
};
