// Author       : Lijian Qiu
// Email        : loye.qiu@gmail.com
// Description  : nodejs proxy, implemented steam interface, supports socks4, socks4a, socks5 and http.


var stream = require('stream');
var util = require('util');

var Connector = require('./connector').Connector;


//Proxy : Stream (
//  [proxy : {
//    [type : <string>'direct'(default)|'http'|'socks4'|'socks5'],
//    host : <string>(ignored when type is null or 'direct'),
//    port : <number>(ignored when type is null or 'direct')
//  }]
//)
function Proxy(proxy) {
  stream.Duplex.call(this);

  this.proxy = proxy ? proxy : { type: 'direct' };

  this.on('error', function () {
    this.push(null);
    this.socket && this.socket.end();
  });
}
util.inherits(Proxy, stream.Duplex);

//prototype
(function (proto) {
  proto._write = function (chunk, encoding, callback) {
    if (this.socket) {
      this.socket.write(chunk, encoding, callback);
    } else {
      var data = typeof chunk === 'string' ? new Buffer(chunk, encoding) : chunk;
      this.connector || (this.connector = new Connector(this, onconnect.bind(this)));
      //connect
      this.socket = this.connector.append(data).connect(this.proxy);
      callback.call(this);
    }
  };

  proto._read = function (n) { };

  function onconnect(socket) {
    var self = this;
    socket.on('data', function (data) {
      self.push(data);
    }).on('close', function () {
      self.push(null);
    }).on('error', function (err) {
      self.emit('error', err);
    });
    this.once('finish', function () {
      this.push(null);
      this.socket && this.socket.end();
    });
    this.emit('connect', socket); //proxy is connected successfully
  }

})(Proxy.prototype);


//exports
exports.Proxy = Proxy;
