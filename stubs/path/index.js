function basename(p, ext) {
  var name = String(p).split(/[\/\\]/).filter(Boolean).pop() || '';
  if (ext && name.endsWith(ext)) name = name.slice(0, -ext.length);
  return name;
}
function join() {
  return Array.prototype.slice.call(arguments).join('/').replace(/\/+/g, '/');
}
function resolve() {
  return join.apply(null, arguments);
}
function dirname(p) {
  var parts = String(p).split(/[\/\\]/);
  parts.pop();
  return parts.join('/') || '.';
}
function extname(p) {
  var b = basename(p);
  var i = b.lastIndexOf('.');
  return i > 0 ? b.slice(i) : '';
}
var m = { basename: basename, join: join, resolve: resolve, dirname: dirname, extname: extname, sep: '/', delimiter: ':', normalize: function(p) { return p; }, isAbsolute: function(p) { return p.charAt(0) === '/'; }, relative: function(f, t) { return t; }, parse: function(p) { return { root: '', dir: dirname(p), base: basename(p), ext: extname(p), name: basename(p, extname(p)) }; } };
m.default = m;
module.exports = m;
