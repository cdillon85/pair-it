import React, { Component } from 'react';
import Socket from './Socket';

export default class BonesJokes extends Component {
  componentDidMount() {
  }

  render() {
    return (
      <div>
        <h1>Pear-it Server</h1>
        <p>This is the backend of the Pear-it Paring app. It opens sockets, handles our authentication and accesses our databases.</p>
        <Socket />
      </div>
    )
  }
}
