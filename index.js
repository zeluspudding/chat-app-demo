// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom
var numUsers = 0;

try {
  function getRoomClients(room) {
    return new Promise((resolve, reject) => {
      io.of('/').in(room).clients((error, clients) => {
        resolve(clients);
      });
    });
  }

  io.on('connection', (socket) => {
    var addedUser = false;

    // when the client emits 'add user', this listens and executes
    socket.on('add user', (data) => {
      if (addedUser) return;

      // we store the username in the socket session for this client
      socket.username = data.username;
      socket.focused = true; // assumes that if a user opens this tab, it is to use it
      socket.join(data.room);
      socket.roomla = data.room;
      ++numUsers;
      addedUser = true;
      // echo globally (all clients) that a person has connected
      socket.broadcast.to(socket.roomla).emit('user joined', {
        username: socket.username,
        numUsers: numUsers,
        usernames: Object.keys(socket.adapter.rooms[socket.roomla]['sockets']).map(client_id => io.sockets.connected[client_id].username),
        focused: Object.keys(socket.adapter.rooms[socket.roomla]['sockets']).map(client_id => io.sockets.connected[client_id].focused),
      });
    });

    // when the client emits 'tab switch', this listens and executes
    socket.on('tab switch', (data) => {
      socket.focused = data;
      socket.broadcast.to(socket.roomla).emit('tab switch', {
        username: socket.username,
        numUsers: numUsers,
        usernames: Object.keys(socket.adapter.rooms[socket.roomla]['sockets']).map(client_id => io.sockets.connected[client_id].username),
        focused: Object.keys(socket.adapter.rooms[socket.roomla]['sockets']).map(client_id => io.sockets.connected[client_id].focused),
      });
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', () => {
      if (addedUser) {
        --numUsers;

        // echo globally that this client has left
        socket.broadcast.to(socket.roomla).emit('user left', {
          username: socket.username,
          numUsers: numUsers,
          usernames: Object.keys(socket.adapter.rooms[socket.roomla]['sockets']).map(client_id => io.sockets.connected[client_id].username),
          focused: Object.keys(socket.adapter.rooms[socket.roomla]['sockets']).map(client_id => io.sockets.connected[client_id].focused),
        });
      }
    });
  });
} catch (e)
{
    console.log(e.message)
}
