Notes
===========

Plan of attack:

* ~Proxy existing Torrent connections~
    https://github.com/krisives/proxysocket/pull/6
    https://github.com/mafintosh/peer-wire-swarm/issues/20
    BASED HUUMANOID

* Proxy HTTP announce (Onionify DNS?)
    https://github.com/feross/bittorrent-tracker/issues/178

* Run Hidden Service

    // https://gist.github.com/timoxley/1689041
    var isPortTaken = function(port, fn) {
      var net = require('net')
      var tester = net.createServer()
      .once('error', function (err) {
        if (err.code != 'EADDRINUSE') return fn(err)
        fn(null, true)
      })
      .once('listening', function() {
        tester.once('close', function() { fn(null, false) })
        .close()
      })
      .listen(port)
    }

    tor -f .tsunami_torrc
        SafeLogging 0
        Log info stdout
        SocksPort 9050
        HiddenServiceDir /tmp/tsunami_service/**random**
        HiddenServicePort 6881 127.0.0.1:6881

    Clean up after if possible
    Make random, get x-platform tmp
        os.tmpdir()
            or
        https://github.com/raszi/node-tmp

    shell.exec()
    https://shapeshed.com/writing-cross-platform-node/

* Announce to Tracker Using Hidden Service Address
    - Can an announce be a URL?
        - Does it need to?
            No, can be DNS name (.onion)
    - Fuck a UDP tracker. :[
        - http://tracker.opentrackr.org:1337/announce works
        - OnionCat won't work outside the network: https://www.whonix.org/wiki/OnionCat
            - Zappa tracker!
                - S3 Database! SQS trimming
    - Can an announce be a .onion URL?
        - Will this require tracker modification?
            - Fuck it, lets invent our own Tracker:
                - https://github.com/Miserlou/zappa-bittorrent-tracker
    - Fuck a DHT. :[
        - UDP only. Boo.
            - Maybe doable inside the network?
    - PEX
        - Should work? http://www.bittorrent.org/beps/bep_0011.html

* Properly Handle Hidden Service Connections
    Once we read hostname file and set as remote address, this may JustWork.
* Bundle Tor
    - Get OSX Tor from brew?
    - Windows 'expert' bundle
    - Linux? https://www.torproject.org/download/download-unix.html.en
        May be just make them use their package manager..

* Bundle Control Port
    May not actually need this for v1
* New Skin in App, because we're fabulous
* Package
    - OSX, Linux, Windows
        https://github.com/electron-userland/electron-packager
        https://github.com/electron-userland/electron-builder
* Slack and all that


SO MANY GOD DAMN PROXY LIBRARIES THAT ALL SUCK
COOL FRENCH GUY WORKING ON SIMILAR PROBLEM?
PEER SWITCHING FUCK
MAGIC PACKET?