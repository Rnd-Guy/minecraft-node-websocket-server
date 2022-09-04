/**
 * This file mostly exists for the sake of holding example code on how to read chat
 */

const WebSocket = require('ws')
const uuid = require('uuid')        // For later use

// Create a new websocket server on port 3000
console.log('Ready. On MineCraft chat, type /connect localhost:3000')
const wss = new WebSocket.Server({ port: 3000 })
const playerServer = new WebSocket.Server({ port: 3001 })


minecraftSocket = null;

// On Minecraft, when you type "/connect localhost:3000" it creates a connection
wss.on('connection', socket => {

  console.log('Connected')
  minecraftSocket = socket;
    // Tell Minecraft to send all chat messages. Required once after Minecraft starts
    socket.send(JSON.stringify({
      "header": {
        "version": 1,                     // We're using the version 1 message protocol
        "requestId": uuid.v4(),           // A unique ID for the request
        "messageType": "commandRequest",  // This is a request ...
        "messagePurpose": "subscribe"     // ... to subscribe to ...
      },
      "body": {
        "eventName": "PlayerMessage"      // ... all player messages.
      },
    }))

    socket.on("message", packet => {
      
      handleMessage(JSON.parse(packet));
    })

    function send(cmd) {
      const msg = {
        "header": {
          "version": 1,
          "requestId": uuid.v4(),     // Send unique ID each time
          "messagePurpose": "commandRequest",
          "messageType": "commandRequest"
        },
        "body": {
          "version": 1,               // TODO: Needed?
          "commandLine": cmd,         // Define the command
          "origin": {
            "type": "player"          // Message comes from player
          }
        }
      }
      socket.send(JSON.stringify(msg))  // Send the JSON string
    }
    
     // Draw a pyramid of size "size" around the player.
     function drawPyramid(size) {
      // y is the height of the pyramid. Start with y=0, and keep building up
      for (let y = 0; y < size + 1; y++) {
        // At the specified y, place blocks in a rectangle of size "side"
        let side = size - y;
        for (let x = -side; x < side + 1; x++) {
          // send(`setblock ~${x} ~${y} ~${-side} glowstone`)
          // send(`setblock ~${x} ~${y} ~${+side} glowstone`)
          // send(`setblock ~${-side} ~${y} ~${x} glowstone`)
          // send(`setblock ~${+side} ~${y} ~${x} glowstone`)
        }
        send(`summon skeleton`)
        send(`summon skeleton`)
        send(`summon skeleton`)
        send(`summon skeleton`)
        send(`summon skeleton`)
        send(`summon skeleton`)
        send(`summon skeleton`)
        send(`summon skeleton`)
        send(`summon skeleton`)
        send(`summon skeleton`)
      }
    }
  
  
    function handleMessage(packet) {
      handlePlayerMessage(packet);
      printPacket(packet);
    }
    
    function handlePlayerMessage(msg) {
      if (msg.header.eventName === 'PlayerMessage') {
        const match = msg.body.message.match(/^pyramid (\d+)/i)
        if (match) {
          drawPyramid(+match[1])
        }
      }
    }
    
    function printPacket(packet) {
      console.log(packet)
    }
})

wss.on("error", socket => {
  console.log(socket.message);
})

wss.on("close", socket => {
  console.log("Connection lost")
})

playerServer.on('connection', socket => {
  socket.on("message", packet => {
    console.log('Received player command');
    console.log(String(packet))
    //console.log(minecraftSocket);
    if (minecraftSocket) {
      const msg = {
        "header": {
          "version": 1,
          "requestId": uuid.v4(),     // Send unique ID each time
          "messagePurpose": "commandRequest",
          "messageType": "commandRequest"
        },
        "body": {
          "version": 1,               // TODO: Needed?
          "commandLine": 'summon ' + String(packet),         // Define the command
          "origin": {
            "type": "player"          // Message comes from player
          }
        }
      }
      minecraftSocket.send(JSON.stringify(msg))  // Send the JSON string
    }
  })

})