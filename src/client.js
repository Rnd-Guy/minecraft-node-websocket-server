/**
 * client
 * This contains commands with target selectors in order to target more than just the host
 * 
 * To run a preset command, pass in the name as a command line argument
 *   eg. node client-solo.js creeper
 * 
 * Full commands can also be ran. Note you must wrap this command with speech marks. You can use another parameter to send how many times the command should run
 *   eg. node client-solo.js "execute @a ~ ~ ~ summon creeper" 5 to spawn 5 creepers on all players
 * 
 * To tailor your experience, you can adjust the values in the COMMANDS CONFIG section, such as changing how many players a command targets
 */

import { createReadStream } from 'fs'
import { createInterface } from 'readline';
import WebSocket from 'ws'

// ##############################
// COMMANDS CONFIG
// change stuff here
// note players is also read from the config.txt, and this config value will take precedence over the value set below if it exists
// this has been written so that you can configure most things all inside this section alone
// ##############################

const statusDur = 10;
const debug = true;
let players = 5;


// name: the name of the command line argument to trigger this command
// repeat: how many times the command should be repeated. this is mostly useful for summons, ie repeat 10 for spawnBees will spawn 10 bees
// commands: an array of commands to be sent to the server. this is usually of the form [...functionName(targetFunction)], where 
//     targetFunction specifies who / how many people are affected by the command
//     see the target commands section below to see what valid values you can have
const presets = [

  // summons
  {name: "bee",         repeat: 10,   commands: [spawnBees(targetAll)]},
  {name: "creeper",     repeat: 1,    commands: [spawnCreepers(targetHalf)]},
  {name: "lightning",   repeat: 1,    commands: [spawnLightning(targetHalf)]},
  {name: "zombie",      repeat: 10,   commands: [spawnZombies(targetAll)]},
  {name: "skeleton",    repeat: 10,   commands: [spawnSkeletons(targetAll)]},
  {name: "ghast",       repeat: 3,    commands: [spawnGhasts(targetAll)]},

  // other
  {name: "shake",   repeat: 1, commands: [cameraShake(targetAll)]},
  {name: "blind",   repeat: 1, commands: [blindPlayers(targetAllButOne)]},
  {name: "poison",  repeat: 1, commands: [poisonPlayers(targetAll)]},
  {name: "hole",    repeat: 1, commands: [digHole(targetHalf, 10)]}, 

  // these ones send more than one command or are a little more technical
  {name: "hp",      repeat: 1, commands: [setHp(targetHalf, 1)]},
  {name: "die",     repeat: 1, commands: [deathWarning(), 
                                          delayCommand(3000), 
                                          death(targetOne)]},
  
  // there are two more commands that aren't listed here
  // "test" runs through each command once
  // "random" picks a random command from the above list
]

// ###########################
// TARGET COMMANDS
// pass these into the above commands list to decide how many people should be affected by the command
// note pass these in without the trailing () eg do not do spawnBees(targetHalf()), as it will read the player variable before the config is read
// ###########################

// @a = all players
// @r[c=2] = two random people

function targetAll() {return `@a`}
function targetAllButOne() {return `@r[c=${Math.max(players-1, 1)}]`}
function targetHalf() {return `@r[c=${Math.floor((players+1)/2)}]`}
function targetOne() {return `@r[c=1]`}


// #############################
// COMMAND FUNCTIONS
// ~ ~ ~ = relative coordinates. ~1 ~1 ~1 means your position + 1 on all axes
// ^ ^ ^ = facing coordinates. ^ ^ ^5 means 5 blocks in front of you
// execute allows us to use a target selector when the command originally does not support one, eg for summon
//
// these return functions as we don't want to evaluate the player count until after we read the config.txt
// all commands are async as there may be commands we wish to run after a delay
// probably a bit overdone
// ##############################

function spawnBees(targets = targetAll)       {return async () => [`execute ${targets()} ~ ~ ~ summon bee`]}
function spawnCreepers(targets = targetHalf)  {return async() => [`execute ${targets()} ^ ^1 ^1 summon creeper`]} // spawn creeper directly in front of player
function spawnLightning(targets = targetHalf) {return async() => [`execute ${targets()} ~ ~ ~ summon lightning_bolt`]}
function spawnZombies(targets = targetAll)    {return async() => [`execute ${targets()} ~ ~ ~ summon zombie`]}
function spawnSkeletons(targets = targetAll)  {return async() => [`execute ${targets()} ~ ~ ~ summon skeleton`]}
function spawnGhasts(targets = targetAll)     {return async() => [`execute ${targets()} ~ ~ ~ summon ghast`]}

function cameraShake(targets = targetAll)         {return async() => [`camerashake add ${targets()} 4 ${statusDur}`]}
function blindPlayers(targets = targetAllButOne)  {return async() => [`effect ${targets()} blindness ${statusDur}`]}
function poisonPlayers(targets = targetHalf)      {return async() => [`effect ${targetHalf()} poison ${statusDur}`]}
function digHole(targets = targetOne, depth = 10) {
  // 3 depth is harmless
  // 4 is half a heart, 5 is a whole heart, 10 is 3.5 hearts
  return () => [`execute ${targets()} ~ ~ ~ fill ~-1 ~-1 ~-1 ~1 ~-${depth} ~1 air`]
}

// we use tags in order to target random people with a sequence of commands
function setHp(targets = targetHalf, hp = 1) {
  return async () => [`tag ${targets()} add hp`,
                `effect @a[tag=hp] instant_health 1 255`, // fully heal target
                `damage @a[tag=hp] ${20 - hp}`,           // then damage them
                `tag @a[tag=hp] remove hp`
              ]
}

function deathWarning() {return async () => [`say Omae wa mou shindeiru`]}
function death(targets = targetOne) {return async () => [`kill ${targets()}`]}

// this can be passed inside the commands array to send commands after a delay
function delayCommand(timer = 10000) {return async () => {await delay(timer); return ``}}

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
  await run();
  wss.close()
}

wss.on("error", e => {
  console.log("Could not connect to server, check if this is the correct host: [" + host + ":" + port + "]");
})

async function run() {
  if (process.argv.length > 2) {

    let param = process.argv[2]
    if (param === "test") {
      await testAllCommands(5000);
      return;
    } else if (param === "random") {
      let randomIndex = Math.floor(Math.random() *presets.length)
      param = presets[randomIndex].name
    }

    let data = getCommand(param)
    await sendCommand(data);

  } else {
    wss.send(JSON.stringify({name: "debug", repeat: 1, command: "say debug message"}));
    console.log("Sent debug command to host. Please pass a minecraft command or a preset command as a command line argument")
    console.log("Supported commands are: random" + presets.reduce((previous, current,) => previous + ", " + current.name, ""))
  }
}

// #########################
// HELPER FUNCTIONS
// ##########################

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
} 
  
async function readFile(name) {
  let filePath = process.cwd() + "\\" + name;
  let reader = createInterface({
    input: createReadStream(filePath),
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

async function testAllCommands(timeBetweenCommands = 5000) {
  console.log("Running through all commands")
    for (let i of presets) {
      await sendCommand(i);
      await delay(timeBetweenCommands)
    }
}

// gets the command object from the name, or returns a custom command object if one isn't found
function getCommand(name) {
  let data = presets.find(c => c.name.toUpperCase() === name.toUpperCase());
  if (!data) {
    data = {name: "custom", repeat: 1, commands: [async () => [name]]}
    if (process.argv.length > 3) {
      data.repeat = Number(process.argv[3])
    }
  }
  return data;
}

async function sendCommand(command) {
  // commands are evaluated one by one, so that we can pass in delay commands 
  for (let i = 0; i < command.commands.length; ++i) {
    let messages = [...(await command.commands[i]())];
    for (let j = 0; j < messages.length; ++j) {
      let data = {name: command.name, repeat: command.repeat, command: messages[j]}
      if (debug) {
        console.log(data);
      }
      wss.send(JSON.stringify(data))
      await delay(100)
    }
  }
}
