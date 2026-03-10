const {Client,GatewayIntentBits,EmbedBuilder,SlashCommandBuilder,REST,Routes} = require("discord.js")
const fs = require("fs")

const config = JSON.parse(fs.readFileSync("./config.json"))
let schedule = JSON.parse(fs.readFileSync("./schedule.json"))

const client = new Client({intents:[GatewayIntentBits.Guilds]})

const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]

function save(){
fs.writeFileSync("./schedule.json",JSON.stringify(schedule,null,2))
}

function serverNow(){

let now = new Date()
let utc = now.getTime() + now.getTimezoneOffset()*60000

return new Date(utc - 2*3600000)

}

function nextEvent(day,data){

let now = new Date()
let today = now.getDay()

let diff = (day - today + 7) % 7

let event = new Date()

event.setUTCDate(now.getUTCDate()+diff)
event.setUTCHours(data.hour+2)
event.setUTCMinutes(data.minute)

if(event < now){
event.setUTCDate(event.getUTCDate()+7)
}

return event
}

function getNext(){

let next = null

for(let d in schedule){

let e = nextEvent(parseInt(d),schedule[d])

if(!next || e < next){
next = e
}

}

return next
}

function createEmbed(){

let next = getNext()
let now = new Date()

let diff = next-now

let h = Math.floor(diff/(1000*60*60))
let m = Math.floor((diff%(1000*60*60))/(1000*60))

let today = serverNow().getDay()

const embed = new EmbedBuilder()

.setTitle("🔥 GUILD CARAVAN SCHEDULE")
.setColor("#ff3300")

.setDescription(
`⏳ **Next caravan in ${h}h ${m}m**

<t:${Math.floor(next/1000)}:F>

━━━━━━━━━━━━━━━━━━━━`
)

for(let d in schedule){

let data = schedule[d]

let event = nextEvent(parseInt(d),data)

let title = `📅 ${days[d]}`

if(parseInt(d) === today){
title = `🟢 TODAY — ${days[d]}`
}

embed.addFields({

name:title,

value:
`🚚 **Driver:** ${data.driver}
🕒 **Server:** ${data.hour}:${data.minute.toString().padStart(2,"0")}
🌍 **Your time:** <t:${Math.floor(event/1000)}:t>`

})

}

embed.setFooter({text:"Server timezone UTC-2"})

return embed
}

let panel

client.once("ready",async()=>{

console.log("Caravan bot ready")

const channel = await client.channels.fetch(config.channelId)

panel = await channel.send({
embeds:[createEmbed()]
})

setInterval(async()=>{

try{
await panel.edit({embeds:[createEmbed()]})
}catch{}

},60000)

setInterval(async()=>{

let next = getNext()
let now = new Date()

let diff = next-now

if(diff < 600000 && diff > 540000){

channel.send(`<@&${config.pingRole}> ⚠️ Caravan starts in **10 minutes!**`)

}

},60000)

})

client.on("interactionCreate",async interaction=>{

if(!interaction.isChatInputCommand()) return

if(interaction.commandName === "driver"){

let day = interaction.options.getInteger("day")
let name = interaction.options.getString("name")

schedule[day].driver = name

save()

await interaction.reply("✅ Driver updated")

}

if(interaction.commandName === "time"){

let day = interaction.options.getInteger("day")
let hour = interaction.options.getInteger("hour")
let minute = interaction.options.getInteger("minute")

schedule[day].hour = hour
schedule[day].minute = minute

save()

await interaction.reply("✅ Time updated")

}

})

console.log("ENV TOKEN:", process.env.TOKEN);
client.login(process.env.TOKEN);

const commands=[

new SlashCommandBuilder()
.setName("driver")
.setDescription("Change caravan driver")
.addIntegerOption(o=>o.setName("day").setDescription("0-6 Sunday-Saturday").setRequired(true))
.addStringOption(o=>o.setName("name").setDescription("Driver name").setRequired(true)),

new SlashCommandBuilder()
.setName("time")
.setDescription("Change caravan time")
.addIntegerOption(o=>o.setName("day").setDescription("0-6 Sunday-Saturday").setRequired(true))
.addIntegerOption(o=>o.setName("hour").setDescription("hour").setRequired(true))
.addIntegerOption(o=>o.setName("minute").setDescription("minute").setRequired(true))

]

const rest = new REST({version:"10"}).setToken(config.token)

;(async()=>{

await rest.put(
Routes.applicationGuildCommands(config.clientId,config.guildId),
{body:commands}
)


})()
