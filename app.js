const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "build")));
  app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

let port = process.env.PORT || 4000;

var PLAYER_COUNTER = {};
var PLAYER_POSITIONS = {};
var PLAYER_POKEMON = {};

function resetRoom(roomId) {
  delete PLAYER_COUNTER[roomId];
  delete PLAYER_POKEMON[roomId];
  delete PLAYER_POSITIONS[roomId];
}

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
      setTimeout(resetRoom, 4 * 60 * 60 * 1000, lobby);
    } else {
      //Reject join if room does not exist
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
      positions: PLAYER_POSITIONS[data.room]
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
    io.to(data.room).emit("moved", {
      positions: PLAYER_POSITIONS[data.room]
    });
  });

  socket.on("rolled", data => {
    io.to(data.room).emit("displayRoll", {
      roll: data.roll
    });
  });

  socket.on("removePlayer", data => {
    PLAYER_POSITIONS[data.room][data.player] = "REMOVED";
    io.to(data.room).emit("moved", {
      positions: PLAYER_POSITIONS[data.room]
    });
  });

  socket.on("lonePlayer", lobby => {
    PLAYER_COUNTER[lobby] = 1;
    PLAYER_POSITIONS[lobby] = {};
    PLAYER_POKEMON[lobby] = {};
    PLAYER_POSITIONS[lobby][1] = 1;
    PLAYER_POKEMON[lobby][1] = null;
  });

  socket.on("deleteRoom", lobby => {
    delete PLAYER_COUNTER[lobby];
    delete PLAYER_POSITIONS[lobby];
    delete PLAYER_POKEMON[lobby];
  });
});

http.listen(port, () => {
  console.log("listening on *:" + port);
});
