proxy.stream
============

It's a nodejs proxy, implemented steam interface, supports socks4, socks4a, socks5 and http.

## How to use

Install by `$ npm install proxy.stream`

Use `new Proxy({ type: 'direct' })` to create a proxy stream.

###Example 1: direct access

It start an proxy on port 2000;

```js
var net = require('net');
var Proxy = require('proxy.stream').Proxy;
net.createServer(function (s) {
  var proxy = new Proxy(); //it's equal to new Proxy({ type: 'direct' })
  s.pipe(proxy).pipe(s);
}).listen(2000, function () {
  console.log('http/socks4/socks5 proxy listening on port 2000');
});
```

###Example 2: access throw another proxy

It turns the socks5 proxy [localhost:2000] to another proxy supports http/socks4/socks5!

```js
var net = require('net');
var Proxy = require('proxy.stream').Proxy;
net.createServer(function (s) {
  s.pipe(new Proxy({ type: 'socks5', host: 'localhost', port: 2000 })).pipe(s);
}).listen(8080, function () {
  console.log('http/socks4/socks5 proxy listening on port 8080');
});
```

###Example 3: qproxy

Proxy based on WebSocket. [Source](https://github.com/loye/node.qproxy)

###More

This is a stream, it can be used simply in multiple scenarios.
