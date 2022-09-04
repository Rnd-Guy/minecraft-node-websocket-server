/**
 * Server solo
 * Intended usage is for only one person to connect to this server. Note you can still have multiple players and use this in multiplayer
 * To affect other players, the commands should contain target selectors (eg @a to target all players or @r[c=2] to target two random players)
 * 
 * The server is only responsible for sending the commands from the client to the minecraft host
 * Any logic should be done on the client side as the client can be updated without needing to restart the server
 */

import {WebSocketServer} from 'ws'
import {v4 as uuid} from 'uuid'

const wss = new WebSocketServer({ port: 3000 })
const playerServer = new WebSocketServer({ port: 3001 })
console.log('Ready. On MineCraft chat, type /connect localhost:3000')

let minecraftSocket = null;

wss.on('connection', socket => {
  console.log('Connected')
  minecraftSocket = socket;

  socket.on("close", () => {
    console.log("Connection closed")
  })
})

playerServer.on('connection', socket => {
  socket.on("message", packet => {

    let data = JSON.parse(packet);

    let {name, command, repeat} = data;
    if (name === "debug") {
      command = "say debug"
    }
    console.log(`[${name}]: ${command} * ${repeat}`)
    
    if (minecraftSocket) {
      const msg = {
        "header": {
          "version": 1,
          "requestId": uuid(),
          "messagePurpose": "commandRequest",
          "messageType": "commandRequest"
        },
        "body": {
          "version": 1,
          "commandLine": command,
          "origin": {
            "type": "player"          // Message comes from player (not sure if there's a better origin)
          }
        }
      }
      for (let i = 0; i < repeat; ++i) {
        minecraftSocket.send(JSON.stringify(msg))
      }
      
    } else {
      console.log("No minecraft clients connected")
    }
  })

})