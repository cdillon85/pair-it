import React, { Component } from 'react';
// import { Link } from 'react-router';
export default class Home extends Component {

  render() {
    return (
      <div className="container-fluid main-container login">
        <div className="row">
          <div className="offset-xs-2 col-xs-12">
            <img className="img-responsive logo logo-landing" src="/img/Pairit2-04.png" />
            <div className="desc">
              <h1>Welcome to Pair.it!</h1>
              <h1>Pair program from anywhere with your collaborators.</h1>
            </div>
            <br />
            <form method="get" action="/Pair.it-1.0.0.dmg">
              <button type="submit">Download Pair.It Now for Mac</button>
            </form>
          </div>
        </div>
        <footer>
          <a href="https://github.com/jjdeehan/pair-it-app">
            <div className='callToAction' >
              <i className="fa fa-github" /> Check out our repo on Github
            </div>
          </a>
        </footer>
      </div>
    );
  }
}
