// Browser-native crypto using WebCrypto API
// Matches the API surface used by GramJS (Helpers.js, Password.js)

function Hash(algorithm) {
  this.algorithm = algorithm;
  this.data = null;
}

Hash.prototype.update = function(data) {
  if (typeof data === 'string') {
    var encoder = new TextEncoder();
    this.data = encoder.encode(data);
  } else if (data instanceof Uint8Array) {
    this.data = new Uint8Array(data);
  } else if (data && data.buffer) {
    this.data = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  } else {
    this.data = new Uint8Array(data);
  }
  return this;
};

Hash.prototype.digest = function(encoding) {
  var self = this;
  var algo = this.algorithm === 'sha1' ? 'SHA-1'
           : this.algorithm === 'sha256' ? 'SHA-256'
           : this.algorithm === 'sha512' ? 'SHA-512'
           : this.algorithm.toUpperCase();

  var promise = crypto.subtle.digest(algo, self.data || new Uint8Array(0)).then(function(buf) {
    var result = Buffer.from(buf);
    if (encoding === 'hex') {
      return Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    }
    return result;
  });
  // GramJS awaits digest(), so returning a Promise is correct
  return promise;
};

function createHash(algorithm) {
  return new Hash(algorithm);
}

function randomBytes(size) {
  var buf = new Uint8Array(size);
  crypto.getRandomValues(buf);
  return Buffer.from(buf);
}

function pbkdf2Sync(password, salt, iterations, keylen, digest) {
  // This is actually async in browser, but GramJS awaits it
  return crypto.subtle.importKey(
    'raw',
    password instanceof Uint8Array ? password : Buffer.from(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  ).then(function(key) {
    var hashName = digest === 'sha512' ? 'SHA-512'
                 : digest === 'sha256' ? 'SHA-256'
                 : digest === 'sha1' ? 'SHA-1'
                 : digest.toUpperCase();
    return crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: hashName, salt: salt instanceof Uint8Array ? salt : Buffer.from(salt), iterations: iterations },
      key,
      keylen * 8
    );
  }).then(function(bits) {
    return Buffer.from(bits);
  });
}

function createCipheriv() { throw new Error('createCipheriv: use GramJS built-in crypto'); }
function createDecipheriv() { throw new Error('createDecipheriv: use GramJS built-in crypto'); }

module.exports = {
  createHash: createHash,
  randomBytes: randomBytes,
  pbkdf2Sync: pbkdf2Sync,
  createCipheriv: createCipheriv,
  createDecipheriv: createDecipheriv,
  Hash: Hash,
  subtle: (typeof crypto !== 'undefined') ? crypto.subtle : undefined,
  getRandomValues: function(buf) { return crypto.getRandomValues(buf); },
  webcrypto: (typeof crypto !== 'undefined') ? crypto : undefined
};
