import React from 'react'
import { Link } from 'react-router'

import sh from 'shell'

export default class PageAboutContainer extends React.Component {
  openUrl(url) {
    sh.openExternal(url)
  }

  render() {
    return (
      <div className="col-sm-9 page">
        <div className="panel panel-default">
          <div className="panel-heading">
            <h3 className="panel-title">About</h3>
          </div>
          <div className="panel-body">
            <div className="brand">
              <img src="../icon/res/mipmap-hdpi/ic_launcher.png" />
            </div>
            <p>
              <b>Tsunami</b> is an experimental anonymous BitTorrent client built on Tor, torrent-stream and Electron.
            </p>
            <p>
              Learn more at: <i>https://github.com/Miserlou/Tsunami</i>
            </p>
          </div>
        </div>
      </div>
    )
  }

}
