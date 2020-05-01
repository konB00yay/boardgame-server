const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

var PLAYER_COUNTER = {};

io.on("connection", socket => {
  socket.on("rooms", room => {
    const lobby = room.id;
    socket.join(lobby);
    if (room.action == "create") {
      PLAYER_COUNTER[lobby] = 1;
    } else {
      PLAYER_COUNTER[lobby] = PLAYER_COUNTER[lobby] + 1;
      io.to(lobby).emit("joined", PLAYER_COUNTER[lobby]);
    }
  });

  socket.on("players", room => {
    io.to(room).emit("players", PLAYER_COUNTER[room]);
  });
});

http.listen(4000, () => {
  console.log("listening on *:4000");
});
