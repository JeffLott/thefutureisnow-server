/**
 * The Future is Now - SXSW 2013
 * @author Matt Null - http://mattnull.com
 */

var NODE_ENV = NODE_ENV || false

var http = require('http')
  , fs = require('fs')
  , server = http.createServer(function(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
  })
  , twitter = require('ntwitter')
  , port = NODE_ENV ? 80 : 3000

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

var io = require('socket.io').listen(80);

io.set('log level', 1);                    // reduce logging
io.disable('browser client cache');
io.set('transports', [
    'websocket'
  , 'flashsocket'
  , 'htmlfile'
  , 'xhr-polling'
  , 'jsonp-polling'
]);

// clients object
var clients = {};

io.sockets.on('connection', function (socket) {
  // -- Twitter Example
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
  // -- Web Sockets demo
  socket.on('sendDemoMessage', function(message){
    socket.broadcast.emit('receiveDemoMessage',message)
    socket.emit('receiveDemoMessage',message)
  })

  // -- Chat
  //when the user connects add them to our users object
  clients[socket.id] = {id : socket.id, nickname : false};

  //immediately tell the chat room someone has connected and to update the list of users
  socket.broadcast.emit('userEntered', {id : socket.id});
  socket.broadcast.emit('updateList', clients);
  socket.emit('updateList', clients);
  socket.emit('setClientID', socket.id);
  
  socket.on('sendMessage', function (data) {
    var message = data.message || '';
    var user = data.user || socket.id;
    //sanitize 
    message.replace(/</g, '&lt;');
    //broadcast the update and send it to the sender
    socket.broadcast.emit('chatUpdate', {user : user, message : message});
    socket.emit('chatUpdate', {user : user, message : message});
  });

  socket.on('updateUser', function(user){
    //update their nickname in memory
    clients[socket.id].nickname = user;
    socket.broadcast.emit('updateList', clients);
    socket.emit('updateList', clients);
  });

  socket.on('disconnect', function(){
    console.log('DISCONNECT')
    delete clients[socket.id];
    socket.broadcast.emit('userLeft', {id : socket.id})
    socket.broadcast.emit('updateList', clients);
  });

  socket.on('invite', function(data){
    io.sockets.sockets[data.remoteID].emit('privateInvite', data);
  })
});