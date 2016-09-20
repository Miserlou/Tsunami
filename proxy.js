var socks = require('socksv5');

var port = 9050;
var srv = socks.createServer(function(info, accept, deny) {
  accept();
  console.log("accepted."); 

});
srv.listen(port, 'localhost', function() {
  console.log('SOCKS server listening on port ' + port);
});

srv.useAuth(socks.auth.None());
