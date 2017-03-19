'use strict';

import {emitAnswer, sendCandidate, Session, getSession} from './SocketFunctions.js'

const express = require('express');

const socketio = require('socket.io');

const app = express();

const io = socketio(server);

var sessions = [], users = [];

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('coding event', function(data) {
    console.log('in EXPRESS coding event')
    console.log(data)
    socket.broadcast.emit('receive code', {code: data.code});
  })

  socket.on('user_connected', function(user){
    user.id = socket.id;
    users.push(user);
    console.log('user_connected', users.length);

    io.emit('refresh_user_list', users);
  });

  //Receive offer
  socket.on('start_call_with', function(options){
    console.log('Request call start with '+options.userDestiny.id + ' from '+ options.userCalling.id);
    createCall(socket, options.userCalling, options.userDestiny, options.offer);
  });

  //Receive answer
  socket.on('answer',function(options){
    emitAnswer(socket, options.userDestiny, options.answer);
  });

  //Receive candidates
  socket.on('ice_candidate', function(options){
    console.log('Received ice candidate')
    sendCandidate(socket, options.userDestiny, options.candidate);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

 });

 app.get('/', function(req, res){
     res.sendfile('index.html');
 });

 function createCall(socket, userCalling, userDestiny, offer){
  var sessionId = Date.now();
  var session = new Session(userCalling.id, userDestiny.id);
  session.offer = offer;
  sessions.push(session);

  socket.broadcast.to(userDestiny.id).emit('receiveOffer', {
    offer:offer,
    caller: userCalling
  });
  
  return sessionId;
}


