// Author       : Lijian Qiu
// Email        : loye.qiu@gmail.com
// Description  : examples of creating proxy server

var net = require('net');

var Proxy = require('./').Proxy;

//Example 1: direct access
net.createServer(function (s) {
  var proxy = new Proxy(); //it's equal to new Proxy({ type: 'direct' })
  s.pipe(proxy).pipe(s);
}).listen(2000, function () {
  console.log('http/socks4/socks5 proxy listening on port 2000');
});

//Example 2: access throw another proxy
net.createServer(function (s) {
  s.pipe(new Proxy({ type: 'socks5', host: 'localhost', port: 2000 })).pipe(s);
}).listen(8080, function () {
  console.log('http/socks4/socks5 proxy listening on port 8080');
});
