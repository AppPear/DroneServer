const webSocketsServerPort = 8000;
const webSocketServer = require('websocket').server;
const http = require('http');
const mdns = require('mdns');
const dateFormat = require('dateformat');
var fs = require('fs');

// Spinning the http server and the websocket server.
const server = http.createServer();
server.listen(webSocketsServerPort);
const wsServer = new webSocketServer({
  httpServer: server
});
var txt_record = {
  name: 'drone-server'
}
const ad = mdns.createAdvertisement(mdns.tcp('http'), 4321, {txtRecord: txt_record});
ad.start();

// Generates unique ID for every new connection
const getUniqueID = () => {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return s4() + s4() + '-' + s4();
};


const getDateNowFormatted = () => {
  return dateFormat(new Date(), "yyyy-mm-dd h:MM:ss");
}


// I'm maintaining all active connections in this object
const clients = {};
// I'm maintaining all active users in this object
const users = {};
// The current editor content is maintained here.
let editorContent = null;
// User activity history.
let userActivity = [];



const sendMessage = (json) => {
  // We are sending the current data to all connected clients
  Object.keys(clients).map((client) => {
    clients[client].sendUTF(json);
  });
}

const typesDef = {
  USER_EVENT: "userevent",
  CONTENT_CHANGE: "contentchange"
}

wsServer.on('request', function(request) {
  var userID = getUniqueID();
  console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');
  // You can rewrite this part of the code to accept only the requests from allowed origin
  const connection = request.accept(null, request.origin);
  clients[userID] = connection;
  console.log('connected: ' + userID + ' in ' + Object.getOwnPropertyNames(clients));
  var stream = fs.createWriteStream(getDateNowFormatted() + ".txt");
  var streamOpen = false;
  stream.once('open', function(fd) {
    streamOpen = true;
  });
  connection.on('message', function(message) {
    if (message.type === 'utf8') {
      const dataFromClient = JSON.parse(message.utf8Data);
      const coordinate = {
        coordinate: dataFromClient.coordinate
      }
      if(streamOpen) {
        stream.write(JSON.stringify(coordinate) + "\n");
      }
      sendMessage(JSON.stringify(dataFromClient));
    }
  });
  // user disconnected
  connection.on('close', function(connection) {
    console.log((new Date()) + " Peer " + userID + " disconnected.");
    stream.close();
  });
});
