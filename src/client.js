import fs from 'fs'
import readline from 'readline'
import WebSocket from 'ws'


// #################
// SETUP
// ##################

let fileName = "config.txt";
let host = null;
let port = 3001;
let id = "default"

async function readFile(name) {
  let filePath = process.cwd() + "\\" + "src\\" + name;
  let reader = readline.createInterface({
    input: fs.createReadStream(filePath),
  })

  for await (const line of reader) {
    let split = line.split("=");
    if (split[0] === "host") {
      host = split[1];
    } else if (split[0] === "port") {
      port = split[1];
    } else if (split[0] === "id") {
      id = split[1];
    }
  }
}
// ###################################
// READ CONFIG
// ################################


await readFile(fileName);

if (host == null) {
  console.log("Error, need a file called config.txt with host=hostname contained within");
  process.exit();
}

// ###########################
// CONNECT AND SEND MESSAGE
// ###########################


const wss = new WebSocket(`ws://${host}:${port}`)
  
wss.onopen = () => {
  console.log(process.argv)
  if (process.argv.length > 2) {
    console.log(process.argv[2])
    //wss.send(id + ":" + "execute @a ~ ~ ~ " + process.argv[2])

    let data = {
      id,
      command: process.argv[2],
      repeat: 1,
    }

    wss.send(JSON.stringify(data))
  } else {
    wss.send(id + ":debug");
    console.log("Sent debug command to host")
  }
  wss.close()
}

wss.on("error", e => {
  console.log("Could not connect to server, check if this is the correct host: [" + host + ":" + port + "]");
})

// tentative command list
/*
chicken:hen:egg -> spawns 5 chickens under everyone
be -> spawns 5 beees under everyone
rot -> spawns a zombie under everyone
bone -> spawns a skeleton under everyone
witch:which -> spawns 2 witches under everyone

hole -> removes 3 blocks below player
fire -> sets everyone on fire
light -> strikes everyone with lightning




@r = random
@a = all players
@e = all entities, but useful with filters eg @e[sort=random,limit=1]

may be able to set random to a specific number

to test: 
@r[limit=1]
@r[c=1] = select 2 living players

serious things only affect one person
moderate affects 3
light affects all

randomSerious = 1;
randomModerate = 3;



confirmed to work:
/effect @r[c=1] speed  # 30 seconds default
/effect @r blindness 10   # severely reduces vision for 10 seconds


commands that look like they might be interesting
camerashake add @a 4 10  
  - shakes camera positionally with max strength for 10 seconds

damage? would prefer setting hp rather than dmg

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

set hp to 1 by healing to full and then damage


can also use ^ ^ ^ for relative coordinates

*/