import {WebSocketServer} from 'ws'
import {v4 as uuid} from 'uuid'

// Create a new websocket server on port 3000
const wss = new WebSocketServer({ port: 3000 })
const playerServer = new WebSocketServer({ port: 3001 })
const minecraftSockets = []; // holds the connections to each connected minecraft client
console.log('Ready. On MineCraft chat, type /connect localhost:3000')

wss.on('connection', socket => {
  console.log('Connected')
  minecraftSockets.push(socket);

  socket.on("close", () => {
    console.log("Connection closed")
    minecraftSockets = minecraftSockets.filter(s => s !== socket)
  })
})

playerServer.on('connection', socket => {
  socket.on("message", packet => {


    //let instruction = String(packet);

    let data = JSON.parse(packet);
    console.log(data)
    /*
    let id = instruction.split(":")[0];
    let message = instruction.split(":")[1];

     console.log("[" + id + "]: " + message)
     
     let commandSplit = message.split("*");
     let command = commandSplit[0];
     let repeat = commandSplit.length > 1 ? commandSplit[1] : 1;
     */
    //let id = data.id;
    let {id, command, repeat} = data;
    console.log("[" + id + "]: " + command + " * " + repeat)
    if (command.startsWith("debug")) {
      return;
    }
    
    if (minecraftSockets.length > 0) {

      const msg = {
        "header": {
          "version": 1,
          "requestId": uuid(),     // Send unique ID each time
          "messagePurpose": "commandRequest",
          "messageType": "commandRequest"
        },
        "body": {
          "version": 1,               // TODO: Needed?
          "commandLine": command,         // Define the command
          "origin": {
            "type": "player"          // Message comes from player
          }
        }
      }
      for (s of minecraftSockets) {
        for (let i = 0; i < repeat; ++i) {
          s.send(JSON.stringify(msg))  // Send the JSON string
        }
      }
    } else {
      console.log("No minecraft clients connected")
    }
  })

})