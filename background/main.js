var fs = require('fs');
var file = require("fs");
var path = require("path");
var os = require("os");
var tmp = require('tmp');
var tcpPortUsed = require('tcp-port-used');

var app = require('app')
var BrowserWindow = require('browser-window')
var Menu = require('menu')
var menu, template

var TorrentManager = require('./lib/manager')
var GlobalState = require('./lib/global-state')

require('electron-debug')()
require('crash-reporter').start()

var mainWindow = null
var tmp_dir = null
var hostname = null
var tor_process = null

app.on('window-all-closed', function() {

  // Clean up our mess.
  if(tmp_dir != null){

    // http://stackoverflow.com/a/32197381
    var deleteFolderRecursive = function(fpath) {
      if( fs.existsSync(fpath) ) {
        fs.readdirSync(fpath).forEach(function(file, index){
          var curPath = path.join(fpath, file);
          if(fs.lstatSync(curPath).isDirectory()) { // recurse
            deleteFolderRecursive(curPath);
          } else { // delete file
            fs.unlinkSync(curPath);
          }
        });
        fs.rmdirSync(fpath);
      }
    };

    console.log("Going to delete " + tmp_dir);
    deleteFolderRecursive(tmp_dir);
  }

  // Kill tor, if able
  if(tor_process != null){
    console.log("Killing Tor..");
    process.kill(tor_process);
  }

  TorrentManager.quit().then(function() {
    app.quit();
  });
})

app.on('open-url', function(event, url) {
  if (GlobalState.getWindow()) {
    TorrentManager.openUrl(url);
  } else {
    app.on('preopen-url', function() {
      TorrentManager.openUrl(url);
    });
  }
})

app.on('open-file', function(event, path) {
  if (GlobalState.getWindow()) {
    TorrentManager.openFile(path);
  } else {
    app.on('preopen-url', function() {
      TorrentManager.openFile(path);
    });
  }
})

app.on('ready', function() {
  mainWindow = new BrowserWindow({ width: 1024, height: 600, resizable: true });

  GlobalState.setWindow(mainWindow);

  /*
    Don't establish torrents until Tor is fully connected.
  */
  const exec = require('child_process').exec;

  tcpPortUsed.check(9050, '127.0.0.1')
  .then(function(inUse) {
      console.log('Port 9050 usage: ' + inUse);

      if(!inUse){
        console.log("Starting Tor..");

        // This should be x-platform
        tmp_dir = tmp.dirSync().name;
        console.log(tmp_dir);
        var tmp_file = path.join(tmp_dir, '.tsunami_torrc');

        var torrc_contents = "SafeLogging 0 \n\
Log info stdout \n\
SocksPort 9050 \n\
"
        torrc_contents = torrc_contents + "HiddenServiceDir " + tmp_dir
        torrc_contents = torrc_contents + "\nHiddenServicePort 6881 127.0.0.1:6881"
        var contents = file.writeFileSync(tmp_file, torrc_contents);

        tor_process = exec('./tor/tor -f ' + tmp_file);
        tor_process = tor_process.pid;

        console.log(path.join(tmp_dir, 'hostname'));
        console.log("is the hostnamepath");

        console.log("tor_process is ");
        console.log(tor_process);

        tcpPortUsed.waitUntilUsed(9050)
        .then(function() {
            console.log('Port 9050 is now in use.');

            hostname = file.readFileSync(path.join(tmp_dir, 'hostname'));
            console.log(hostname);
            console.log("is the hostname");

            // Tor connected, establish Torrents.
            TorrentManager.bindIpc();
            TorrentManager.restore(hostname);

        }, function(err) {
            console.log('Error:', err.message);
        });
      } else{
        console.log("Proxy already running, starting Torrents.")
        // XXX: No way to get hostname?

        // Tor connected, establish Torrents.
        TorrentManager.bindIpc();
        TorrentManager.restore("tsunami.onion"); // XXX
      }

  }, function(err) {
      console.error('Error on check:', err.message);
  });

  app.emit('preopen-url');
  app.emit('preopen-file');

  if (process.env.HOT) {
    mainWindow.loadUrl('file://' + __dirname + '/../app/hot-dev-app.html')
  } else {
    mainWindow.loadUrl('file://' + __dirname + '/../app/app.html')
  }

  mainWindow.on('closed', function() {
    mainWindow = null
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.openDevTools()
  }

  if (process.platform === 'darwin') {
    template = [{
      label: 'Electron',
      submenu: [{
        label: 'About ElectronReact',
        selector: 'orderFrontStandardAboutPanel:'
      }, {
        type: 'separator'
      }, {
        label: 'Services',
        submenu: []
      }, {
        type: 'separator'
      }, {
        label: 'Hide ElectronReact',
        accelerator: 'Command+H',
        selector: 'hide:'
      }, {
        label: 'Hide Others',
        accelerator: 'Command+Shift+H',
        selector: 'hideOtherApplications:'
      }, {
        label: 'Show All',
        selector: 'unhideAllApplications:'
      }, {
        type: 'separator'
      }, {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: function() {
          app.quit()
        }
      }]
    }, {
      label: 'Edit',
      submenu: [{
        label: 'Undo',
        accelerator: 'Command+Z',
        selector: 'undo:'
      }, {
        label: 'Redo',
        accelerator: 'Shift+Command+Z',
        selector: 'redo:'
      }, {
        type: 'separator'
      }, {
        label: 'Cut',
        accelerator: 'Command+X',
        selector: 'cut:'
      }, {
        label: 'Copy',
        accelerator: 'Command+C',
        selector: 'copy:'
      }, {
        label: 'Paste',
        accelerator: 'Command+V',
        selector: 'paste:'
      }, {
        label: 'Select All',
        accelerator: 'Command+A',
        selector: 'selectAll:'
      }]
    }, {
      label: 'View',
      submenu: [{
        label: 'Reload',
        accelerator: 'Command+R',
        click: function() {
          mainWindow.restart()
        }
      }, {
        label: 'Toggle Full Screen',
        accelerator: 'Ctrl+Command+F',
        click: function() {
          mainWindow.setFullScreen(!mainWindow.isFullScreen())
        }
      }, {
        label: 'Toggle Developer Tools',
        accelerator: 'Alt+Command+I',
        click: function() {
          mainWindow.toggleDevTools()
        }
      }]
    }, {
      label: 'Window',
      submenu: [{
        label: 'Minimize',
        accelerator: 'Command+M',
        selector: 'performMiniaturize:'
      }, {
        label: 'Close',
        accelerator: 'Command+W',
        selector: 'performClose:'
      }, {
        type: 'separator'
      }, {
        label: 'Bring All to Front',
        selector: 'arrangeInFront:'
      }]
    }]

    menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  } else {
    template = [{
      label: '&File',
      submenu: [{
        label: '&Open',
        accelerator: 'Ctrl+O'
      }, {
        label: '&Close',
        accelerator: 'Ctrl+W',
        click: function() {
          mainWindow.close()
        }
      }]
    }, {
      label: '&View',
      submenu: [{
        label: '&Reload',
        accelerator: 'Ctrl+R',
        click: function() {
          mainWindow.restart()
        }
      }, {
        label: 'Toggle &Full Screen',
        accelerator: 'F11',
        click: function() {
          mainWindow.setFullScreen(!mainWindow.isFullScreen())
        }
      }, {
        label: 'Toggle &Developer Tools',
        accelerator: 'Alt+Ctrl+I',
        click: function() {
          mainWindow.toggleDevTools()
        }
      }]
    }]
    menu = Menu.buildFromTemplate(template)
    mainWindow.setMenu(menu)
  }
})
