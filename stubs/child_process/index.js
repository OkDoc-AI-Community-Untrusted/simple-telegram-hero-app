// child_process module - not available in browser
module.exports = {
  exec: function(cmd, opts, cb) { if (typeof opts === 'function') { cb = opts; } if (cb) cb(new Error('child_process not available in browser')); },
  execSync: function() { throw new Error('child_process not available in browser'); },
  spawn: function() { throw new Error('child_process not available in browser'); },
  fork: function() { throw new Error('child_process not available in browser'); }
};
