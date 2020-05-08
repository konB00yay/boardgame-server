const app = require("express")();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

var PLAYER_COUNTER = {};
var PLAYER_POSITIONS = {};
var PLAYER_POKEMON = {};

io.on("connection", socket => {
  socket.on("rooms", room => {
    const lobby = room.id;
    socket.join(lobby);
    if (room.action == "create") {
      PLAYER_COUNTER[lobby] = 1;
      PLAYER_POSITIONS[lobby] = {};
      PLAYER_POKEMON[lobby] = {};
      PLAYER_POSITIONS[lobby][1] = 1;
      PLAYER_POKEMON[lobby][1] = null;
    } else {
      PLAYER_COUNTER[lobby] = PLAYER_COUNTER[lobby] + 1;
      PLAYER_POSITIONS[lobby][PLAYER_COUNTER[lobby]] = 1;
      PLAYER_POKEMON[lobby][PLAYER_COUNTER[lobby]] = null;
      io.to(lobby).emit("joined", {
        positions: PLAYER_POSITIONS[lobby],
        pokemon: PLAYER_POKEMON[lobby]
      });
    }
  });

  socket.on("players", room => {
    io.to(room).emit("players", PLAYER_POSITIONS[room]);
  });

  socket.on("move", data => {
    PLAYER_POSITIONS[data.room][data.player] = data.newSpace;
    io.to(data.room).emit("moved", {
      newSpaces: PLAYER_POSITIONS[data.room]
    });
  });

  socket.on("nextTurn", data => {
    io.to(data.room).emit("newTurn", {
      newTurn: data.turn
    });
  });

  socket.on("pokemon", data => {
    PLAYER_POKEMON[data.room][data.player] = data.pokemon;
    io.to(data.room).emit("pokemonPicked", {
      newPokemon: PLAYER_POKEMON[data.room]
    });
  });

  socket.on("reset", data => {
    Object.entries(PLAYER_POKEMON[data.room]).map(([key, value]) => {
      PLAYER_POKEMON[data.room][key] = null;
    });
    Object.entries(PLAYER_POSITIONS[data.room]).map(([key, value]) => {
      PLAYER_POSITIONS[data.room][key] = 1;
    });
    io.to(data.room).emit("newGame", {
      positions: PLAYER_POSITIONS[data.room],
      pokemon: PLAYER_POKEMON[data.room]
    });
  });

  socket.on("resetPlayer", data => {
    PLAYER_POSITIONS[data.room][data.player] = 1;
    io.to(data.room).emit("playerReset", {
      positions: PLAYER_POSITIONS[data.room]
    });
  });
});

http.listen(4000, () => {
  console.log("listening on *:4000");
});
