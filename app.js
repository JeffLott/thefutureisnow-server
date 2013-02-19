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
});