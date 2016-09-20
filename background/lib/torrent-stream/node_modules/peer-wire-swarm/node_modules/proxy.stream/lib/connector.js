// Author       : Lijian Qiu
// Email        : loye.qiu@gmail.com
// Description  : connector for proxy, it's accept proxy request and connect to remote host or proxy.


var events = require("events");
var util = require('util');
var net = require('net');

var IP = require('./ip').IP;
var HttpParser = require('./http_parser').HttpParser;


//Connector : EventEmitter
//  src: <Stream>
//  onconnect: <function(<Socket>)>
function Connector(src, onconnect) {
  events.EventEmitter.call(this);

  this.src = src;

  this.once('result', function (err, socket) {
    socket.removeAllListeners('error');
    if (err) {
      this.emit('prefailed', err);
      this.emit('failed', err);
    } else {
      this.emit('preready', socket);
      this.emit('ready', socket);
    }
  }).on('ready', function (socket) {
    onconnect(socket);
  }).on('failed', function (err) {
    src.emit('error', err);
  });
}
util.inherits(Connector, events.EventEmitter);

//prototype
(function (proto) {
  var HTTP_CONNECT_RESPONSE_200 = new Buffer('HTTP/1.1 200 Connection Established\r\nConnection: close\r\n\r\n', 'ascii');
  var HTTP_CONNECT_RESPONSE_502 = new Buffer('HTTP/1.1 502 Connection Failed\r\nConnection: close\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n', 'ascii');

  //  Socks4:
  //  |VER{1}4|ATYP{1}1|DST.PORT{2}|DST.ADDR{4}|USERID{}|END{1}0|[?(Socks4a)DST.ADDR=0,0,0,1?DST.HOST{}|END{1}0]
  //  |REP{1}0|PROTOCOL{1}90|DST.PORT{2}|DST.ADDR{4}|
  //  Socks5:
  //  |VER{1}5|NMETHODS{1}|METHODS{NMETHODS}|
  //  |VER{1}5|METHOD{1}|
  //  |VER{1}5|CMD{1}[1(TCP)|3(UDP)]|RSV{1}0|ATYP{1}[1(IPv4)/3(HOST)/4(IPv6)]|[DST.ADDR{4}/DST.NHOST{1}|DST.HOST{DST.NHOST}]|DST.PORT{2}|
  //  |VER{1}5|REP{1}0|RSV{1}0|ATYP{1}1|BND.ADDR{4}|BIND.PORT{2}| : 5, 0, 0, 1, 0, 0, 0, 0, 0, 0

  proto.connect = function (proxy) {
    this.proxy = proxy;
    var socket;

    (this.endpoint = accept.call(this)) && (socket = connect.call(this));

    return socket;
  };

  proto.append = function (data) {
    this.buffer = this.buffer ? Buffer.concat([this.buffer, data]) : data;
    return this;
  };

  proto.push = function (data) {
    this.src.push(data);
    return this;
  };

  function accept() {
    var buffer = this.buffer;
    var endpoint;
    if (buffer[0] === 0x04) {
      //socks4
      endpoint = acceptSocks4.call(this);
    } else if (buffer[0] === 0x05) {
      //socks5
      endpoint = acceptSocks5.call(this);
    } else if (buffer[0] > 0x40 && buffer[0] < 0x5B) {
      //http
      endpoint = acceptHttp.call(this);
    }
    return endpoint;
  }

  function acceptSocks4() {
    var buffer = this.buffer;
    var host, ip, port = (buffer[2] << 8) + buffer[3], index;
    //skip USERID
    for (index = 8; index < buffer.length && buffer[index] !== 0; index++) {}
    // host (Socks4a)
    if (buffer[4] === 0 && buffer[5] === 0 && buffer[6] === 0 && buffer[7] > 0) {
      for (var i = ++index; i < buffer.length; i++) {
        if (buffer[i] === 0) {
          host = buffer.toString('ascii', index, i);
          break;
        }
      }
    } else {
      host = ip = buffer[4] + '.' + buffer[5] + '.' + buffer[6] + '.' + buffer[7];
    }
    //success
    this.push(new Buffer([0, 90, buffer[2], buffer[3], buffer[4], buffer[5], buffer[6], buffer[7]]));
    return { type: 'socks4', host: host, ip: ip, port: port };
  }

  function acceptSocks5() {
    var buffer = this.buffer;

    if (this.socks5) {
      var host, ip, port;
      buffer = buffer.slice(this.socks5.index);
      switch (buffer[3]) {
        case 1: //ipv4
          host = ip = buffer[4] + '.' + buffer[5] + '.' + buffer[6] + '.' + buffer[7];
          port = (buffer[8] << 8) + buffer[9];
          //success
          this.push(new Buffer([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]));
          break;
        case 3: //host
          host = buffer.toString('ascii', 5, 5 + buffer[4]);
          port = (buffer[5 + buffer[4]] << 8) + buffer[5 + buffer[4] + 1];
          //success
          this.push(new Buffer([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]));
          break;
        case 4: //ipv6 not supported
        default:
          //address type not supported
          this.push(new Buffer([5, 8, 0, 1, 0, 0, 0, 0, 0, 0]));
      }
      return port ? { type: 'socks5', host: host, ip: ip, port: port } : null;
    } else {
      var hasAnonymousMethod;
      for (var i = 2; i < buffer[1] + 2 && i < buffer.length; i++) {
        if (buffer[i] === 0) {
          hasAnonymousMethod = true;
          break;
        }
      }
      if (hasAnonymousMethod) {
        this.socks5 = { index: buffer.length };
        //anonymous authentication
        this.push(new Buffer([5, 0]));
      }
      else {
        //authentication not supported
        this.push(new Buffer([5, 0xFF]));
      }
    }
    return null;
  }

  function acceptHttp() {
    var buffer = this.buffer;
    var header = new HttpParser().parseHeader(buffer);

    if (header) {
      if (header.method === 'CONNECT') {
        this.once('preready', function () {
          this.push(HTTP_CONNECT_RESPONSE_200);
        });
      } else {
        this.once('preready', function (s) {
          s.write(buffer);
        });
      }
      this.once('prefailed', function (err) {
        this.push(HTTP_CONNECT_RESPONSE_502);
        this.push(err);
      });
      return { type: 'http', host: header.host, port: header.port };
    }
    return null;
  }

  function connect() {
    var self = this, endpoint = this.endpoint;
    var socket;
    switch (this.proxy.type) {
      case 'socks4':
        socket = connectSocks4.call(this);
        break;
      case 'socks5':
        socket = connectSocks5.call(this);
        break;
      case 'http':
        socket = connectHttp.call(this);
        break;
      case 'direct':
      default: //default is direct
        socket = net.connect(endpoint.port, endpoint.host, function () {
          self.emit('result', null, this);
        }).on('error', function () {
          self.emit('result', 'Connect to [' + endpoint.host + ':' + endpoint.port + '] failed', this);
        });
        break;
    }
    return socket;
  }

  function connectSocks4() {
    var self = this, endpoint = self.endpoint, proxy = self.proxy;
    var socket, buf, ip = IP.parse(endpoint.host), requestBuffer = new Buffer(ip ? 9 : endpoint.host.length + 10);
    requestBuffer[0] = 4;
    requestBuffer[1] = 1;
    requestBuffer[2] = endpoint.port >> 8;
    requestBuffer[3] = endpoint.port & 0xFF;
    (ip ? ip.binary : new Buffer([0, 0, 0, 1])).copy(requestBuffer, 4, 0, 4);
    requestBuffer[8] = 0;
    if (!ip) {
      new Buffer(endpoint.host, 'ascii').copy(requestBuffer, 9, 0, endpoint.host.length);
      requestBuffer[requestBuffer.length - 1] = 0;
    }

    var ondata = function (data) {
      buf = buf ? Buffer.concat([buf, data]) : data;
      if (buf.length >= 8) {
        socket.removeListener('data', ondata);
        self.emit('result', null, this);
      }
    };
    socket = net.connect(proxy.port, proxy.host, function () {
      this.write(requestBuffer);
    }).on('data', ondata).on('error', function () {
      self.emit('result', 'connect to Socks4 proxy [' + proxy.host + ':' + proxy.port + '] failed', this);
    });
    return socket;
  }

  function connectSocks5() {
    var self = this, endpoint = self.endpoint, proxy = self.proxy;
    var socket, buf, ip = IP.parse(endpoint.host), step = 1, requestBuffer;
    var ondata = function (data) {
      buf = buf ? Buffer.concat([buf, data]) : data;
      if (step === 1) {
        if (buf.length >= 2 && buf[1] === 0) {
          requestBuffer = new Buffer(ip ? 10 : endpoint.host.length + 7);
          requestBuffer[0] = 5;
          requestBuffer[1] = 1;
          requestBuffer[2] = 0;
          requestBuffer[3] = ip ? 1 : 3;
          if (ip) {
            ip.binary.copy(requestBuffer, 4, 0, 4);
          } else {
            requestBuffer[4] = endpoint.host.length;
            new Buffer(endpoint.host, 'ascii').copy(requestBuffer, 5, 0, endpoint.host.length);
          }
          requestBuffer[requestBuffer.length - 2] = endpoint.port >> 8;
          requestBuffer[requestBuffer.length - 1] = endpoint.port & 0xFF;
          this.write(requestBuffer);
          buf = null;
          step++;
        }
      } else if (step === 2) {
        if (buf.length >= 10) {
          socket.removeListener('data', ondata);
          if (buf[1] === 0) {
            self.emit('result', null, this);
          } else {
            self.emit('result', 'connect to Socks5 proxy [' + proxy.host + ':' + proxy.port + '] failed', this);
          }
        }
      }
    };
    socket = net.connect(proxy.port, proxy.host, function () {
      this.write(new Buffer([5, 1, 0]));
    }).on('data', ondata).on('error', function () {
      self.emit('result', 'connect to Socks5 proxy [' + proxy.host + ':' + proxy.port + '] failed', this);
    });
    return socket;
  }

  function connectHttp() {
    var self = this, endpoint = self.endpoint, proxy = self.proxy;
    var socket, buf, response;
    var ondata = function (data) {
      buf = buf ? Buffer.concat([buf, data]) : data;
      if (response = new HttpParser().parse(buf)) {
        socket.removeListener('data', ondata);
        if (response.header.code === 200) {
          self.emit('result', null, this);
        } else {
          self.emit('result', 'connect to Http proxy [' + proxy.host + ':' + proxy.port + '] failed: ' + response.header.startline, this);
        }
      }
    };
    socket = net.connect(proxy.port, proxy.host, function () {
      this.write(new Buffer('CONNECT ' + endpoint.host + ':' + endpoint.port + ' HTTP/1.1\r\nHost: ' + endpoint.host + ':' + endpoint.port + '\r\n\r\n', 'ascii'));
    }).on('data', ondata).on('error', function () {
      self.emit('result', 'connect to Http proxy [' + proxy.host + ':' + proxy.port + '] failed', this);
    });
    return socket;
  }

})(Connector.prototype);

//exports
module.exports.Connector = Connector;
