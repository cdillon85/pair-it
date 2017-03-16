'use strict';

const express = require('express');

const socketio = require('socket.io');

const app = express();

const server = app.listen(process.env.PORT || 3000, function(){
  console.log('listening on', app.address().port);
});

app.get('/', function(req, res){
    res.sendfile('index.html');
});

const io = socketio(server);


io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('coding event', function(data) {
    console.log('in EXPRESS coding event')
    console.log(data)
    socket.broadcast.emit('receive code', {code: data.code});
  })
 
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

 });

app.use(express.static(__dirname));



