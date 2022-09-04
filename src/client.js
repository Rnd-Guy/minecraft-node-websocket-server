/**
 * client solo
 * For use with server solo as the only client connecting to it
 * This contains commands with target selectors in order to target more than just the host
 * 
 * To run a preset command, pass in the name as a command line argument
 *   eg. node client-solo.js creeper
 * 
 * Full commands can also be ran. Note you must wrap this command with speech marks. You can use another parameter to send how many times the command should run
 *   eg. node client-solo.js "summon creeper" 5
 */

import fs from 'fs'
import readline from 'readline'
import WebSocket from 'ws'

// ##############################
// COMMANDS
// ~ ~ ~ = relative coordinates. ~1 ~1 ~1 means your position + 1 on all axes
// ^ ^ ^ = facing coordinates. ^ ^ ^5 means 5 blocks in front of you
// execute allows us to use a target selector when the command originally does not support one
// ##############################

const statusDur = 10;
const debug = true;
let players = 1;

// command is a function so that the player count is read when it is needed


// tentative command list
/*
@r = random
@a = all players
@e = all entities, but useful with filters eg @e[sort=random,limit=1]

commands that look like they might be interesting
camerashake add @a 4 10  
  - shakes camera positionally with max strength for 10 seconds

effect @r[c=?] blindness 10 
  - seems to be the only effect worth adding (except maybe poison too)

execute @r[c=?] ~ ~ ~ (command)
  - lets me run something on random people so i can then center the effects on them
  - example: execute @r[c=?] ~ ~ ~ fill ~-1 ~-1 ~-1 ~1 ~-5 ~1 air
  - this will dig a hole under ? people

fill ~-1 ~-1 ~-1 ~1 ~-5 ~1 air 
  - this will make a hole beneath the player
  - -3 is the highest hold that won't dmg the player
  - -4 will dmg half a heart
  - -5 will dmg a whole heart

set hp to 1 by healing to full and then damage. note it has to target the same person so its a little tricky
  - effect


can also use ^ ^ ^ for relative coordinates

*/
const commands = [
  // summons
  {name: "bee",     repeat: 10, command: () => `execute ${targetAll()} ~ ~ ~ summon bee`},
  {name: "creeper", repeat: 1,  command: () => `execute ${targetHalf()} ~ ~1 ~1 summon creeper`},
  {name: "lightning", repeat: 1, command: () => `execute ${targetHalf()} ~ ~ ~ summon lightning_bolt`},
  {name: "zombie", repeat: 10, command: () => `execute ${targetAll()} ~ ~ ~ summon zombie`},
  {name: "skeleton", repeat: 10, command: () => `execute ${targetAll()} ~ ~ ~ summon skeleton`},
  {name: "ghast", repeat: 3, command: () => `execute ${targetAll()} ~ ~ ~ summon ghast`},

  // other
  {name: "shake", repeat: 1, command: () => `camerashake add ${targetAll()} 4 ${statusDur}`},
  {name: "blind", repeat: 1, command: () => `effect ${targetAllButOne()} blindness ${statusDur}`},
  {name: "poison", repeat: 1, command: () => `effect ${targetHalf()} poison ${statusDur}`},
  {name: "hole",  repeat: 1, command: () => `execute ${targetOne()} ~ ~ ~ fill ~-1 ~-1 ~-1 ~1 ~-5 ~1 air`},

  // specific (these require logic on the server's side)
  {name: "hp", repeat: 1, command: () => `hp ${targetOne()}`}, // this comes in two commands so the server will interpret this for us
  {name: "die", repeat: 1, command: () => ``}
]



// #################
// SETUP
// ##################

const fileName = "config.txt";
let host = null;
let port = "3001";
let id = "default"




await readFile(fileName);

if (host == null) {
  console.log("Error, need a file called config.txt with host=hostname contained within");
  process.exit();
}

// ###########################
// CONNECT AND SEND MESSAGE
// ###########################


const wss = new WebSocket(`ws://${host}:${port}`)
  
wss.onopen = async () => {
  await sendCommand();
  wss.close()
}

wss.on("error", e => {
  console.log("Could not connect to server, check if this is the correct host: [" + host + ":" + port + "]");
})

async function sendCommand() {
  if (process.argv.length > 2) {
    if (process.argv[2] === "test") {
      console.log("Running through all commands")
      for (let i of commands) {
        let data = parseCommand(i.name);
        console.log(i.name)
        wss.send(JSON.stringify(data))
        await delay(5000)
      }
      return;
    } 

    let data = parseCommand(process.argv[2])
    wss.send(JSON.stringify(data))

    if (debug) {
      console.log(data)
    }

  } else {
    wss.send(JSON.stringify({name: "debug", repeat: 1, command: ""}));
    console.log("Sent debug command to host. Please pass a minecraft command or a preset command as a command line argument")
    console.log("Supported commands are: test" + commands.reduce((previous, current,) => previous + ", " + current.name, ""))
  }
}

function parseCommand(name) {
  let data = commands.find(c => c.name.toUpperCase() === name.toUpperCase());
  if (data) {
    data.command = data.command();
  } else {
    data = {name: "custom", repeat: 1, command: name}
    if (process.argv.length > 3) {
      data.repeat = Number(process.argv[3])
    }
  }
  return data;
}


// #########################
// HELPER FUNCTIONS
// ##########################

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
} 
  
async function readFile(name) {
  let filePath = process.cwd() + "\\" + name;
  let reader = readline.createInterface({
    input: fs.createReadStream(filePath),
  })

  for await (const line of reader) {
    let split = line.split("=");
    switch (split[0]) {
      case "host":
        host = split[1];
        break;
      case "port":
        port = split[1];
        break;
      case "id":
        id = split[1];
        break;
      case "players":
        players = Number(split[1]);
        break;
    }
  }
}

// @a = all players
// @r[c=2] = two random people
function targetAll() {
  return `@a`
}
function targetAllButOne() {
  return `@r[c=${Math.max(players-1, 1)}]`
}
function targetHalf() {
  return `@r[c=${Math.floor((players+1)/2)}]`
}
function targetOne() {
  return `@r[c=1]`
}