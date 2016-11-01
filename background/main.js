var app = require('app')
var BrowserWindow = require('browser-window')
var Menu = require('menu')
var menu, template

var TorrentManager = require('./lib/manager')
var GlobalState = require('./lib/global-state')

require('electron-debug')()
require('crash-reporter').start()

var mainWindow = null

app.on('window-all-closed', function() {
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
  mainWindow = new BrowserWindow({ width: 1024, height: 600, resizable: false });

  GlobalState.setWindow(mainWindow);

  /*
    Don't establish torrents until Tor is fully connected.
  */
  var tcpPortUsed = require('tcp-port-used');
  const exec = require('child_process').exec;

  tcpPortUsed.check(9050, '127.0.0.1')
  .then(function(inUse) {
      console.log('Port 9050 usage: ' + inUse);

      if(!inUse){
        console.log("Starting Tor..");
        tor_process = exec('./tor/tor');

        tcpPortUsed.waitUntilUsed(9050)
        .then(function() {
            console.log('Port 9050 is now in use.');
              // Tor connected, establish Torrents.
              TorrentManager.bindIpc();
              TorrentManager.restore();

        }, function(err) {
            console.log('Error:', err.message);
        });
      } else{
        console.log("Proxy already running, starting Torrents.")
        // Tor connected, establish Torrents.
        TorrentManager.bindIpc();
        TorrentManager.restore();
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
    }, {
      label: 'Help',
      submenu: [{
        label: 'Learn More',
        click: function() {
          require('shell').openExternal('http://electron.atom.io')
        }
      }, {
        label: 'Documentation',
        click: function() {
          require('shell').openExternal('https://github.com/atom/electron/tree/master/docs#readme')
        }
      }, {
        label: 'Community Discussions',
        click: function() {
          require('shell').openExternal('https://discuss.atom.io/c/electron')
        }
      }, {
        label: 'Search Issues',
        click: function() {
          require('shell').openExternal('https://github.com/atom/electron/issues')
        }
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
    }, {
      label: 'Help',
      submenu: [{
        label: 'Learn More',
        click: function() {
          require('shell').openExternal('http://electron.atom.io')
        }
      }, {
        label: 'Documentation',
        click: function() {
          require('shell').openExternal('https://github.com/atom/electron/tree/master/docs#readme')
        }
      }, {
        label: 'Community Discussions',
        click: function() {
          require('shell').openExternal('https://discuss.atom.io/c/electron')
        }
      }, {
        label: 'Search Issues',
        click: function() {
          require('shell').openExternal('https://github.com/atom/electron/issues')
        }
      }]
    }]
    menu = Menu.buildFromTemplate(template)
    mainWindow.setMenu(menu)
  }
})
