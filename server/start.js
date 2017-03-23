'use strict'

const socketFunctions = require('./SocketFunctions')

const express = require('express')
const bodyParser = require('body-parser')
const {resolve} = require('path')
const passport = require('passport')
const PrettyError = require('pretty-error')
const finalHandler = require('finalhandler')
const socketio = require('socket.io');

// PrettyError docs: https://www.npmjs.com/package/pretty-error

// Bones has a symlink from node_modules/APP to the root of the app.
// That means that we can require paths relative to the app root by
// saying require('APP/whatever').
//
// This next line requires our root index.js:
const pkg = require('APP')

const app = express()

if (!pkg.isProduction && !pkg.isTesting) {
  // Logging middleware (dev only)
  app.use(require('volleyball'))
}

// Pretty error prints errors all pretty.
const prettyError = new PrettyError();

// Skip events.js and http.js and similar core node files.
prettyError.skipNodeFiles()

// Skip all the trace lines about express' core and sub-modules.
prettyError.skipPackage('express')

module.exports = app
  // Session middleware - compared to express-session (which is what's used in the Auther workshop), cookie-session stores sessions in a cookie, rather than some other type of session store.
  // Cookie-session docs: https://www.npmjs.com/package/cookie-session
  .use(require('cookie-session') ({
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

  // Error middleware interceptor, delegates to same handler Express uses.
  // https://github.com/expressjs/express/blob/master/lib/application.js#L162
  // https://github.com/pillarjs/finalhandler/blob/master/index.js#L172
  .use((err, req, res, next) => {
    console.error(prettyError.render(err))
    finalHandler(req, res)(err)
  })

if (module === require.main) {
  // Start listening only if we're the main module.
  //
  // https://nodejs.org/api/modules.html#modules_accessing_the_main_module
  const server = app.listen(
    process.env.PORT || 1337,
    () => {
      console.log(`--- Started HTTP Server for ${pkg.name} ---`)
      const { address, port } = server.address()
      const host = address === '::' ? 'localhost' : address
      const urlSafeHost = host.includes(':') ? `[${host}]` : host
      console.log(`Listening on http://${urlSafeHost}:${port}`)
    }
  )

/*-------------------------THIS IS THE SOCKET IO STUFF-------------------------*/
  const io = socketio(server);


  var sessions = [], users = [];

  io.on('connection', (socket) => {
      console.log('a user connected');

  socket.on('room', (data) => {
    console.log('in server socket for room', data.room)
    socket.join(data.room)
    socket.broadcast.to(data.room).emit('add client', data)
    })

  socket.on('I am here', (data) =>
    socket.broadcast.to(data.room).emit('store collaborator', {name: data.name}))


//TEXT-EDITOR SOCKET EVENTS
      socket.on('coding event', function(data) {
        socket.broadcast.to(data.room).emit('receive code', {code: data.code});
      });

      socket.on('opened file', function (data) {
        socket.broadcast.to(data.room).emit('new file is opened', data);
      })

      socket.on('tab changed', function (data){
        socket.broadcast.to(data.room).emit('change to new tab', {index: data.index, file: data.file});
      })

      socket.on('save file', function(data) {
        socket.broadcast.to(data.room).emit('file was saved', data)
      })

      socket.on('added a tab', function(data) {
        socket.broadcast.to(data.room).emit('new tab added', { length: data.length })
      })

      socket.on('closed tab', function(data) {
        socket.broadcast.to(data.room).emit('a tab was closed', { filePath: data.filePath, text: data.text })
      })


      socket.on('user_connected', function(user){
        user.id = socket.id;
        users.push(user);
        console.log('user_connected', users.length);
    //was io.emit
        io.emit('refresh_user_list', users);
      });

      //Receive offer
      socket.on('start_call_with', function(options){
        console.log('Request call start with '+options.userDestiny.id + ' from ' + options.userCalling.id);
        createCall(socket, options.userCalling, options.userDestiny, options.offer);
      });

      //Receive answer
      socket.on('answer',function(options){
        socketFunctions.emitAnswer(socket, options.userDestiny, options.answer);
      });

      //Receive candidates
      socket.on('ice_candidate', function(options){
        console.log('Received ice candidate')
        socketFunctions.sendCandidate(socket, options.userDestiny, options.candidate);
      });

      socket.on('disconnect', () => {
        users = users.filter((user) => user.id !== socket.id);
        console.log('user disconnected');
      });
  });

  app.get('/', function(req, res){
    res.sendfile('index.html');
  });

}

function createCall(socket, userCalling, userDestiny, offer) {
  var sessionId = Date.now();
  var session = new socketFunctions.Session(userCalling.id, userDestiny.id);
  session.offer = offer;
  sessions.push(session);

  socket.broadcast.to(userDestiny.id).emit('receiveOffer', {
    offer: offer,
    caller: userCalling
  });

  return sessionId;
}

// This check on line 64 is only starting the server if this file is being run directly by Node, and not required by another file.
// Bones does this for testing reasons. If we're running our app in development or production, we've run it directly from Node using 'npm start'.
// If we're testing, then we don't actually want to start the server; 'module === require.main' will luckily be false in that case, because we would be requiring in this file in our tests rather than running it directly.
