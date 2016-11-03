Notes
===========

Plan of attack:

* ~~~Proxy existing Torrent connections~~~
    https://github.com/krisives/proxysocket/pull/6
    https://github.com/mafintosh/peer-wire-swarm/issues/20
    BASED HUUMANOID

* Proxy HTTP announce (Onionify DNS?)
    https://github.com/feross/bittorrent-tracker/issues/178

    var requiredOpts = {
          infoHash: new Buffer(torrent.infohash), // hex string or Buffer
          peerId: new Buffer(opts.id), // hex string or Buffer
          announce: [torrent.announce], // list of tracker server urls
          port: port, // torrent client port, (in browser, optional)
          proxyOpts: {
              // Socks proxy options (used to proxy requests in node)
              socksProxy: {
                  // Configuration from socks module (https://github.com/JoshGlazebrook/socks)
                  proxy: {
                      // IP Address of Proxy (Required)
                      ipaddress: "127.0.0.1",
                      // TCP Port of Proxy (Required)
                      port: 9050,
                      // Proxy Type [4, 5] (Required)
                      // Note: 4 works for both 4 and 4a.
                      // Type 4 does not support UDP association relay
                      type: 5
                  },

                  // Amount of time to wait for a connection to be established. (Optional)
                  // - defaults to 10000ms (10 seconds)
                  timeout: 10000
              }
          }
        }

        //var client = new Client(requiredOpts)

        //var tr = new tracker.Client(new Buffer(opts.id), port, torrent);
        var tr = new tracker.Client(requiredOpts);

* ~~~Run Hidden Service~~~

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

    FUCKKKKK
    https://github.com/feross/bittorrent-tracker/issues/181
    nm we good fam
        actually we're not good, we can't use getAnnounceOpts without updating to 7.3.0
            > https://github.com/feross/bittorrent-tracker/issues/3
            > Fixed by #107 and released as 7.3.0.

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
    - NPM HELL FUCK SHIT
    - OSX, Linux, Windows
        https://github.com/electron-userland/electron-packager
        https://github.com/electron-userland/electron-builder
* Slack and all that


SO MANY GOD DAMN PROXY LIBRARIES THAT ALL SUCK
COOL FRENCH GUY WORKING ON SIMILAR PROBLEM?
PEER SWITCHING FUCK
MAGIC PACKET?

Dat BEP tho https://github.com/feross/webtorrent/pull/881#pullrequestreview-5369250

Compromising Tor Anonymity
Exploiting P2P Information Leakage
https://arxiv.org/pdf/1004.1461.pdf
    - Pretty much all dumb shit client implementations, UDP/DHT, including real IP, etc.