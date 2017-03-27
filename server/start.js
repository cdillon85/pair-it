'use strict';

const socketFunctions = require('./SocketFunctions');

const express = require('express');
const bodyParser = require('body-parser');
const {resolve} = require('path');
const passport = require('passport');
const PrettyError = require('pretty-error');
const finalHandler = require('finalhandler');
const socketio = require('socket.io');

// This next line requires our root index.js:
const pkg = require('APP');

const app = express();

if (!pkg.isProduction && !pkg.isTesting) {
  // Logging middleware (dev only)
  app.use(require('volleyball'));
}

// Pretty error prints errors all pretty.
const prettyError = new PrettyError();

// Skip events.js and http.js and similar core node files.
prettyError.skipNodeFiles();

// Skip all the trace lines about express' core and sub-modules.
prettyError.skipPackage('express');

module.exports = app

  .use(require('cookie-session')({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'an insecure secret key'],
  }))

  // Body parsing middleware
  .use(bodyParser.urlencoded({ extended: true }))
  .use(bodyParser.json())

  // Authentication middleware
  .use(passport.initialize())
  .use(passport.session())

  // Serve static files from ../public
  .use(express.static(resolve(__dirname, '..', 'public')))

  // Serve our api - ./api also requires in ../db, which syncs with our database
  .use('/api', require('./api'))

  // Send index.html for anything else.
  .get('/*', (_, res) => res.sendFile(resolve(__dirname, '..', 'public', 'index.html')))

  .use((err, req, res, next) => {
    console.error(prettyError.render(err));
    finalHandler(req, res)(err);
  });

if (module === require.main) {

  const server = app.listen(
    process.env.PORT || 1337,
    () => {
      console.log(`--- Started HTTP Server for ${pkg.name} ---`);
      const { address, port } = server.address();
      const host = address === '::' ? 'localhost' : address;
      const urlSafeHost = host.includes(':') ? `[${host}]` : host;
      console.log(`Listening on http://${urlSafeHost}:${port}`);
    }
  );

/*-------------------------THIS IS THE SOCKET IO STUFF-------------------------*/
  const io = socketio(server);


  let sessions = [], users = [];

  io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('room', (data) => {
      console.log('in server socket for room', data.room);
      socket.join(data.room);
      socket.broadcast.to(data.room).emit('add client', data);
      });

    socket.on('I am here', (data) => {
      socket.broadcast.to(data.room).emit('store collaborator', {playerInfo: data.playerInfo});
    });

    socket.on('Pair with me', (data) => {
      console.log('pairing with another: ', data);
      socket.broadcast.to(data.room).emit('Partner', {name: data.name, url: data.url});
    });

    socket.on('go to pair room', (data) => {
      socket.broadcast.to(data.room).emit('go to pair room');
    });

    socket.on('leaving room', (data) => {
      socket.broadcast.to(data.room).emit('remove collaborator', {playerInfo: data.playerInfo});
      socket.leave(data.room);
    });

  ////////////////////////////////////// TEXT EDITOR //////////////////////////////////////

    socket.on('coding event', (data) => {
      socket.broadcast.to(data.room).emit('receive code', {code: data.code});
    });

    socket.on('opened file', (data) => {
      socket.broadcast.to(data.room).emit('new file is opened', data);
    });

    socket.on('tab changed', (data) => {
      console.log('tab changed');
      socket.broadcast.to(data.room).emit('change to new tab', {index: data.index, file: data.file});
    });

    socket.on('save file', (data) => {
      socket.broadcast.to(data.room).emit('file was saved', data);
    });

    socket.on('added a tab', (data) => {
      socket.broadcast.to(data.room).emit('new tab added', { length: data.length });
    });

    socket.on('closed tab', (data) => {
      console.log(data);
      socket.broadcast.to(data.room).emit('a tab was closed', { fileToClose: data.fileToClose, fileToActive: data.fileToActive, index: data.index });
    });

  ////////////////////////////////////// PEER TO PEER VIDEO //////////////////////////////////////

    socket.on('user_connected', (user) => {
      user.id = socket.id;
      users.push(user);
      console.log('user_connected', users.length);
      io.emit('refresh_user_list', users);
    });

    //Receive offer
    socket.on('start_call_with', (options) => {
      console.log('Request call start with ' + options.userDestiny.id + ' from ' + options.userCalling.id);
      createCall(socket, options.userCalling, options.userDestiny, options.offer);
    });

    socket.on('closed connection', (data) => {
      socket.broadcast.to(data.room).emit('peer connection severed');
    });

    //Receive answer
    socket.on('answer', (options) => {
      socketFunctions.emitAnswer(socket, options.userDestiny, options.answer);
    });

    //Receive candidates
    socket.on('ice_candidate', (options) => {
      console.log('Received ice candidate');
      socketFunctions.sendCandidate(socket, options.userDestiny, options.candidate);
    });

  ////////////////////////////////////// DRIVER - NAVIGATOR //////////////////////////////////////

    socket.on('driver selected', (data) => {
      socket.broadcast.to(data.room).emit('partner picked self as driver', {});
    });

    socket.on('navigator selected', (data) => {
      socket.broadcast.to(data.room).emit('partner picked you as driver', {});
    });

    ////////////////////////////////////// DISCONNECT //////////////////////////////////////

    socket.on('disconnect', () => {
      users = users.filter((user) => user.id !== socket.id);
      console.log('user disconnected');
    });

  });

  app.get('/', (req, res) => {
    res.sendfile('index.html');
  });

  const createCall = (socket, userCalling, userDestiny, offer) => {
    var sessionId = Date.now();
    var session = new socketFunctions.Session(userCalling.id, userDestiny.id);
    session.offer = offer;
    sessions.push(session);

    socket.broadcast.to(userDestiny.id).emit('receiveOffer', {
      offer: offer,
      caller: userCalling
    });

    return sessionId;
  };

}
