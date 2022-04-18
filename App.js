const app = require("express")(5000);
const server = require("http").createServer(app);
const cors = require("cors");

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

const PORT = process.env.PORT || 5000;

var lobby = [];
var partner = null;

app.get("/", (req, res) => {
  res.send("server is runing");
});

io.on("connection", (socket) => {
  socket.partner = null;
  console.log(lobby.length);

  socket.on("join", ({ id, name }) => {
    if (lobby.length > 0) {
      partner = lobby[0];
      socket.partner = partner;
      lobby.splice(0, 1);

      io.to(partner.socketId).emit("partner", {
        socketId: socket.id,
        name,
        id,
        partnerName: socket.partner.name,
        partnerSocketId: socket.partner.socketId,
        partnerId: socket.partner.id,
      });
    } else {
      lobby.push({ socketId: socket.id, name: name, id: id });
    }

    socket.emit("welcome", { socketId: socket.id, id, name });
  });

  socket.on("welcomePartner", ({ socketId, id, name, partnerId }) => {
    socket.partner = { socketId: partnerId };
    io.to(partnerId).emit("partner2", { partnerId: socketId, name, id });
  });

  socket.on("disconnect", () => {
    console.log("dis");
    if (socket.partner === null) {
      for (let i = 0; i < lobby.length; i++) {
        if (lobby[i].socketId === socket.id) {
          lobby.splice(i, 1);
          return;
        }
      }
    } else {
      io.to(socket.partner.socketId).emit("partnerLeave");

      for (let i = 0; i < lobby.length; i++) {
        if (lobby[i].socketId === socket.id) {
          lobby.splice(i, 1);
          return;
        }
      }

      lobby.push(socket.partner);
    }
  });

  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    io.to(userToCall).emit("callUser", { signal: signalData, from, name });
  });

  socket.on("answerCall", ({ signal, to }) => {
    io.to(to).emit("callAccepted", signal);
  });
});

server.listen(PORT, () => console.log("server running on port" + PORT));
