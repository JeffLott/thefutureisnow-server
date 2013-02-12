/**
 * The Future is Now - SXSW 2013
 * @author Matt Null - http://mattnull.com
 */

var http = require('http')
  , fs = require('fs')
  , server = http.createServer()
  , twitter = require('ntwitter')
  , port = 3000

var twitterConfig = fs.readFileSync('twitterconfig.json');

if(twitterConfig){
  twitterConfig = JSON.parse(twitterConfig);
  var twit = new twitter({
    consumer_key: twitterConfig.consumer_key,
    consumer_secret: twitterConfig.consumer_secret,
    access_token_key: twitterConfig.access_token_key,
    access_token_secret: twitterConfig.access_token_secret
  });
}

server.listen(port, function(){
  console.log("Server listening on port " + port);
});

var io = require('socket.io').listen(server);

io.set('log level', 1);                    // reduce logging
io.disable('browser client cache');
io.set('transports', [
    'websocket'
  , 'flashsocket'
  , 'htmlfile'
  , 'xhr-polling'
  , 'jsonp-polling'
]);

// client object
var clients = {}

io.sockets.on('connection', function (socket) {
  // ------ CHAT
  //when the user connects add them to our users object
  clients[socket.id] = {id : socket.id, nickname : false};

  //immediately tell the chat room someone has connected
  socket.broadcast.emit('userEntered', {id : socket.id});
  socket.emit('userList', clients);
  socket.emit('setClientID', socket.id);

  socket.on('sendMessage', function (data) {
    var message = data.message || '';
    var user = data.user || socket.id;

    //broadcast the update and send it to the sender
    socket.broadcast.emit('chatUpdate', {user : user, message : message});
    socket.emit('chatUpdate', {user : user, message : message});

  });

  socket.on('updateUser', function(user){
    //update their nickname in memory
    clients[socket.id].nickname = user;
    socket.broadcast.emit('userUpdate', {id : socket.id, user: user});
    socket.emit('userUpdate', {id : socket.id, user: user});
  });

  socket.on('disconnect', function(){
    delete clients[socket.id];
    socket.broadcast.emit('userLeft', {id : socket.id})
    socket.emit('userList', clients);
  });


  //Video Chat
  socket.on('checkUserStatus', function(data){
    var inSession = !clients[data.to] || !clients[data.to].inSession ? data.to : false;
    socket.emit('userStatus', inSession)
  });

  socket.on('streamVideo', function(data){
    if(io.sockets.sockets[data.to]){
      io.sockets.sockets[data.to].emit('videoStream', data)
    }
  });

  socket.on('streamAudio', function(data){
    if(io.sockets.sockets[data.to]){
      io.sockets.sockets[data.to].emit('audioStream', data)
    }
  });
  // ------ END CHAT

  // -- Twitter Example
    //Twitter example
  if(twit){
    socket.on('fetchTweets', function (data) {
      search = data.search || 'sxsw'
      twit.stream('statuses/filter', {track : search}, function(stream) {
        stream.on('data', function (data) {
          socket.emit('tweets', data)
        });
      });
    });
  }
});