function emitAnswer(socket, userDestiny,answer){
  socket.broadcast.to(userDestiny.id).emit('answer', answer);
}

function sendCandidate(socket, userDestiny, candidate){
  if (userDestiny.id) socket.broadcast.to(userDestiny.id).emit('receiveIceCandidate', candidate);
}

function Session(idCaller, idCallee){
  this.idCaller = idCaller;
  this.idCallee = idCallee;
  this.id = Date.now();
  this.status = null;
}


function getSession(sessionId){

  var possibleSessions = _.filter(sessions, function(session){
    return session.id == sessionId;
  });

  var result =  possibleSessions.length > 0 ? possibleSessions[0] : null;
  console.log('Searching for session, found ', result);
  return result;
}

module.exports = {
  emitAnswer,
  sendCandidate,
  Session,
  getSession
};
