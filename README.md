# minecraft-node-websocket-server
Small websocket server to allow running minecraft commands from outside.
Only supports bedrock (as there's no `/connect` command in java)

Note this is not a multiplayer world, just a server that can send messages to an existing world.

Right now mostly supports one person running the server and client and connecting their minecraft to it. 

> **Warning**  
> To connect minecraft bedrock to a local server, you either need a loopback adapter or to run the following command in admin powershell. This is the same issue you will have if you tried to connect bedrock to a locally hosted dedicated server too. See [this wiki link](https://minecraft.fandom.com/wiki/Bedrock_Dedicated_Server#Connection) for more details:  
> `CheckNetIsolation LoopbackExempt -a -n="Microsoft.MinecraftUWP_8wekyb3d8bbwe"`


## How to start the server
First use node to start the server:
```js
node server.js
```
Right now the server listens to ports 3000 (for minecraft) and 3001 (for external programs to send messages eg client.js). (Maybe configurable later)

Then connect your minecraft to the server by enabling cheats and typing the following command inside the minecraft chat. Both the server and the minecraft client should say that you have connected which means you're now ready to fire commands to it!
```
/connect localhost:3000
```

## How to send commands 

The websocket server listens to json messages that look like the following:
```json
{
    "name": "bee",
    "repeat": 10,
    "command": "execute @a ~ ~ ~ summon bee"
}
```

The command is then sent to minecraft `repeat` amount of times, so the example command above will summon 10 chickens on top of every player.

The `client.js` file can be used to generate these commands easily

## Using the client to send commands

The client can be ran in two ways. A preset argument can be passed through the command line or the command to run can be passed in directly:
```js
// node client.js <preset command name>
node client.js bee 

// node client.js "<custom command>" [<repeat>]
node client.js "execute @a ~ ~ ~ summon bee" 10
```

The top of `client.js` contains the list of preset commands that you can run.

## TODO (but probably wont do)
* Clean up client.js (too many layered functions, did a bit of clean up now though)
* Update documentation with command list
* Create a release using pkg so its easier to use
