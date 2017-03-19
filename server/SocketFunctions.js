export function emitAnswer(socket, userDestiny,answer){
  socket.broadcast.to(userDestiny.id).emit('answer', answer);
}

export function sendCandidate(socket, userDestiny, candidate){
  socket.broadcast.to(userDestiny.id).emit('receiveIceCandidate', candidate);
}

export function Session(idCaller, idCallee){
  this.idCaller = idCaller; 
  this.idCallee = idCallee;
  this.id = Date.now();
  this.status = null;
}


export function getSession(sessionId){

  var possibleSessions = _.filter(sessions, function(session){
    return session.id == sessionId;
  });

  var result =  possibleSessions.length > 0 ? possibleSessions[0] : null;
  console.log('Searching for session, found ', result);
  return result;
}

