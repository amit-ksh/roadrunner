var express = require("express");
var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);

const port = process.env.PORT || 3000;

app.use("/", express.static(__dirname + "/public/desktop"));
app.use("/mobile", express.static(__dirname + "/public/mobile"));

io.on("connection", function (socket) {
  socket.on("mobile connected", function () {
    io.emit("start");
  });

  socket.on("orientation", function (e) {
    console.log(e);
    io.emit("mobile orientation", e);
  });
});

http.listen(port, async () => {
  console.log(`Game running at http://localhost:${port}`);
});
