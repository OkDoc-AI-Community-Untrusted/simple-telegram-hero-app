var noop = function() {};
var noopPromise = function() { return Promise.resolve(); };
var noopCb = function() { var args = arguments; var cb = args[args.length - 1]; if (typeof cb === 'function') cb(new Error('fs not available in browser')); };

module.exports = {
  readFile: noopCb,
  writeFile: noopCb,
  readFileSync: function() { throw new Error('fs not available in browser'); },
  writeFileSync: noop,
  existsSync: function() { return false; },
  mkdirSync: noop,
  readdirSync: function() { return []; },
  statSync: function() { return { isFile: function() { return false; }, isDirectory: function() { return false; }, size: 0 }; },
  lstatSync: function() { return { isFile: function() { return false; }, isDirectory: function() { return false; }, size: 0 }; },
  unlinkSync: noop,
  createReadStream: function() { throw new Error('fs not available in browser'); },
  createWriteStream: function() { throw new Error('fs not available in browser'); },
  promises: {
    readFile: function() { return Promise.reject(new Error('fs not available in browser')); },
    writeFile: noopPromise,
    open: function() { return Promise.reject(new Error('fs not available in browser')); },
    stat: function() { return Promise.resolve({ isFile: function() { return false; }, size: 0 }); },
    lstat: function() { return Promise.resolve({ isFile: function() { return false; }, size: 0 }); },
    readdir: function() { return Promise.resolve([]); },
    mkdir: noopPromise,
    unlink: noopPromise
  }
};
