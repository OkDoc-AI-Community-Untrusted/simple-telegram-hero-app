module.exports = {
  type: function() { return 'Browser'; },
  platform: function() { return 'browser'; },
  release: function() { return '0.0.0'; },
  hostname: function() { return 'localhost'; },
  homedir: function() { return '/'; },
  tmpdir: function() { return '/tmp'; },
  arch: function() { return 'wasm'; },
  cpus: function() { return []; },
  totalmem: function() { return 0; },
  freemem: function() { return 0; },
  networkInterfaces: function() { return {}; },
  endianness: function() { return 'LE'; },
  EOL: '\n'
};
module.exports.default = module.exports;
