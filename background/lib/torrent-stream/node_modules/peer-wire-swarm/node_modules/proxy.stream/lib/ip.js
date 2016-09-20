// Author       : Lijian Qiu
// Email        : loye.qiu@gmail.com
// Description  : ip util object, only support ipv4 currently.


var net = require('net');


//IP
function IP(buffer, start, end) {
  !Array.isArray(buffer) || (buffer = new Buffer(buffer));
  if (Buffer.isBuffer(buffer)) {
    start || (start = 0);
    end || (end = buffer.length);
    if (end - start === 4) {
      this.version = 4;
    } else if (end - start === 16) {
      this.version = 6;
    } else {
      throw 'parameters incorrect!';
    }
    this.binary = buffer.slice(start, end);
  }
  else {
    throw 'parameters incorrect!';
  }
}

IP.parse = function (addr) {
  var isIP = net.isIP(addr);
  if (isIP === 4) {
    var arr = addr.split('.');
    if (arr.length === 4 && arr[0] < 256 && arr[1] < 256 && arr[2] < 256 && arr[3] < 256) {
      return new IP([+arr[0], +arr[1], +arr[2], +arr[3]]);
    }
  } else {
    return null;
  }
};

(function (proto) {
  proto.toString = function () {
    if (this.version === 4) {
      return this.binary[0] + '.' + this.binary[1] + '.' + this.binary[2] + '.' + this.binary[3];
    } else {
      return null;
    }
  };
})(IP.prototype);


//exports
module.exports.IP = IP;
