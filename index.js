require("dotenv").config()
const db = require("./connection")
const auth = require("./model")
const config = require("./config")
const millify = require("millify").millify
const fetch = require("node-fetch")
const Telegram = require("node-telegram-bot-api")
const puppeteer = require('puppeteer');


const bot = new Telegram(process.env.BOT_TOKEN,{polling:true})

let rand = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}
let ads = config.ADS[rand(0,0)]

bot.onText(/\/start/i,async (msg)=>{
    try{
        bot.sendChatAction(msg.chat.id,"typing")
        const chat_id = msg.chat.id
        const text = `<b>Hi ${msg.from.first_name} 👋\nI am ${config.BOT_USERNAME}\nI can help you get the crypto data just by command!\nNeed help ? /help</b>`
        const key = [[{"text":"➕ Add To Group","url":`https://telegram.me/${config.BOT_USERNAME}?startgroup=true`}]]
        bot.sendMessage(chat_id,text,{reply_markup:{inline_keyboard:key},parse_mode:"html"})
        const user = await auth.user.findOne({chat_id:msg.chat.id})
        if(!user){
            let obj
            if(msg.chat.type=="private"){
                obj = {chat_id:msg.chat.id,chat_type:msg.chat.type,first_name:msg.chat.first_name,last_name:msg.chat.last_name,username:msg.chat.username,balance:0}
            }else{
                obj = {chat_id:msg.chat.id,chat_type:msg.chat.type,first_name:msg.chat.title,last_name:null,username:msg.chat.username}
            }
            let name = msg.chat.first_name ?? msg.chat.title
            await auth.user.insertOne(obj)
            const total = await auth.user.countDocuments()
            bot.sendMessage(process.env.ADMIN_ID,`<b>TOTAL_USER : </b><code>[${total}]</code>\n\n<b>TYPE : </b><code>${msg.chat.type}</code>\n<b>FIRST_NAME : <a href="tg://user?id=${msg.chat.id}">${name}</a>\nUSERNAME : </b><b>@${msg.chat.username}</b>\n<b>CHAT_ID : </b><code>${msg.chat.id}</code>`,{parse_mode:"html"})
        }
        return
    }catch(error){
        console.log(error)
        bot.sendMessage(msg.chat.id,config.error_message,{parse_mode:"html",reply_to_message_id:msg.message_id});
        return
    }
})

bot.onText(/\/help/i,async (msg)=>{
    try{
        bot.sendChatAction(msg.chat.id,"typing")
        if(msg.chat.type=="private"){
            let text = `<code>=> /p | /price : Get price of coin\n=> /convert | /conv | /cnv : Convert coins\n=> /mp | /multiple | /multi : Get multiple prices\n=> /calc : Calculate prices\n=> /bio | /desc | /description : Description of a coin\n=> /tv | /tradingview : get trading view chart\n=> /select : Select random winners\n=> /gas : Get gas price of ETH\n=> /txfee : Tx fee of BTC\n=> /advertise : Advertise in bot</code>`
            bot.sendMessage(msg.chat.id,text,{parse_mode:"html",reply_to_message_id:msg.message_id})
        }else{
            let text = `<b><a href="https://t.me/${config.BOT_USERNAME}">Open me private</a></b>`
            bot.sendMessage(msg.chat.id,text,{parse_mode:"html",reply_to_message_id:msg.message_id})
        }
        return
    }catch(error){
        console.log(error)
        bot.sendMessage(msg.chat.id,config.error_message,{parse_mode:"html",reply_to_message_id:msg.message_id});
        return
    }
})

bot.onText(/\/p|\/price/i,async (msg)=>{
    try{
        bot.sendChatAction(msg.chat.id,"typing")
        let data = msg.text.toLocaleLowerCase();
        let coin
        if(data == "/p" || data == "/price"){
            coin = [1,"BTC","USDT"]
        }else{
            coin = data.toLocaleUpperCase().replace(/\s+/gm," ").split(" ")
            coin.shift()
        }
        if(coin[0] && coin[1] && coin[2]){
            amt = isNaN(coin[0]) ? 1 : parseFloat(coin[0])
            fr = coin[1]
            to = coin[2]
        }else
        if(coin[0] && coin[1] && !coin[2]){
            if(!isNaN(coin[0])){
                amt = coin[0]
                fr = coin[1]
                to = "USDT"
            }else{
                amt = 1
                fr = coin[0]
                to = coin[1]
            }
        }else
        if(coin[0] && !coin[1] && !coin[2]){
            amt = 1
            fr = coin[0]
            to = "USDT"
        }else{
            amt = 1
            fr = "BTC"
            to = "USDT"
        } 
        let response = await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${fr}&tsyms=${to}`)
        let result = await response.json()
        result = result["RAW"][fr][to]
        const TOT_PRICE = (amt * result.PRICE).toFixed(6)
        const HIGH24HOUR = result.HIGH24HOUR.toFixed(3)
        const LOW24HOUR = result.LOW24HOUR.toFixed(3)
        const CHANGEPCTHOUR = result.CHANGEPCTHOUR.toFixed(2)
        const CHANGEPCT24HOUR = result.CHANGEPCT24HOUR.toFixed(2)
        const MKTCAP = millify(result.MKTCAP, {
            precision: 2
        });
        const SUPPLY = millify(result.SUPPLY, {
            precision: 2
        });
        const text = `<code>${amt} ${fr}: ${TOT_PRICE} ${to}\nHIGH 24H: ${HIGH24HOUR}  ${to}\nLOW 24H: ${LOW24HOUR}  ${to}\n1H: ${CHANGEPCTHOUR}%\n24H: ${CHANGEPCT24HOUR}%\nM-CAP: ${MKTCAP}  ${to}\nSUPPLY: ${SUPPLY}  ${fr}</code>\n<b><a href='${ads.url}'>${ads.text}</a></b>`
        const key = [[{"text":"🔄 Refresh","callback_data":`/p ${amt} ${fr} ${to}`}]]
        bot.sendMessage(msg.chat.id,text,{reply_markup:{inline_keyboard:key},parse_mode:"html",disable_web_page_preview:true})
        let timer = Math.floor(new Date().getTime()/1000)
        await auth.user.updateOne({chat_id:msg.chat.id},{$set:{timer:timer+60}})
        return
    }catch(error){
        console.log(error);
        bot.sendMessage(msg.chat.id,config.error_message,{parse_mode:"html",reply_to_message_id:msg.message_id});
        return
    }
    
})

bot.onText(/\/conv|\/convert|\/cnv/i,async (msg)=>{
    try{
        bot.sendChatAction(msg.chat.id,"typing")
        let data = msg.text.toLocaleLowerCase();
        let coin
        if(data == "/conv" || data == "/convert" || data == "/conv"){
            coin = [1,"BTC","USDT"]
        }else{
            coin = data.toLocaleUpperCase().replace(/\s+/gm," ").split(" ")
            coin.shift()
        }
        if(coin[0] && coin[1] && coin[2]){
            amt = isNaN(coin[0]) ? 1 : parseFloat(coin[0])
            fr = coin[1]
            to = coin[2]
        }else
        if(coin[0] && coin[1] && !coin[2]){
            if(!isNaN(coin[0])){
                amt = coin[0]
                fr = coin[1]
                to = "USDT"
            }else{
                amt = 1
                fr = coin[0]
                to = coin[1]
            }
        }else
        if(coin[0] && !coin[1] && !coin[2]){
            amt = 1
            fr = coin[0]
            to = "USDT"
        }else{
            amt = 1
            fr = "BTC"
            to = "USDT"
        } 
        let response = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${fr}&tsyms=${to}`)
        let result = await response.json()
        result = result[to]
        const TOT_PRICE = (amt * result).toFixed(6)
        const text = `<code>${amt} ${fr}: ${TOT_PRICE} ${to}</code>`
        bot.sendMessage(msg.chat.id,text,{reply_to_message_id:msg.message_id,parse_mode:"html",disable_web_page_preview:true,reply_to_message_id:msg.message_id})
        return
    }catch(error){
        console.log(error)
        bot.sendMessage(msg.chat.id,config.error_message,{parse_mode:"html",reply_to_message_id:msg.message_id});
        return
    }
    
})

bot.onText(/\/tv|\/tradingview/i,async (msg)=>{
    try{
        let data = msg.text.toLocaleLowerCase()
        let params
        let from = "BTC"
        let to = "USDT"
        let theme = "dark"
        let exch = "BINANCE"
        let day = "D"
        let newSet = new Set(["D","W","M"])
        if(data!="/tv" && data!="/tradingview" && !data.includes("@")){
            bot.sendChatAction(msg.chat.id,"upload_photo")
            params = data.toLocaleUpperCase().replace(/\s+/gm," ").split(" ")
            params.shift()
            if(params[0] && !params[1] && !params[2] && !params[3]){
                from = params[0]
            }else if(params[0] && params[1] && !params[2] && !params[3]){
                from = params[0]
                if(newSet.has(params[1])){
                    to = "USDT"
                    day = params[1]
                }else if(!newSet.has(params[1]) && params[1].length==1){
                    to = "USDT"
                    day = "D"
                }else if(params[1].length > 4){
                    exch = params[1]
                    to = "USDT"
                }else{
                    to = params[1]
                }
            }else if(params[0] && params[1] && params[2] && !params[3]){
                from = params[0]
                to = params[1]
                if(newSet.has(params[2])){
                    day = params[2]
                }else if(!newSet.has(params[2]) && params[2].length==1){
                    day = "D"
                }else if(params[2].length > 4){
                    exch = params[2]
                }else{
                    day = "D"
                }
            }else if(params[0] && params[1] && params[2] && params[3]){
                from = params[0]
                to = params[1]
                day = params[2]
                exch = params[3]
            }
        }else{
            bot.sendChatAction(msg.chat.id,"typing")
            let text = `<b>Command</b>\n<code>=> /tv , /tradingview</code>\n\n<b>Usage</b>\n<code>=> /tv {from-coin} {to-coin} {interval} {exchange}</code>\n\n<code>=> From Coin : Eg- BTC\n=> To Coin : Eg- USDT\n=> Interval : D - Day , W - Week , M - Month\n=> Exchange : Eg- Binance,Bitrue,etc.</code>`
            bot.sendMessage(msg.chat.id,text,{parse_mode:"HTML",disable_web_page_preview:true,reply_to_message_id:msg.message_id})
            return
        }
        let time = new Date().getTime()
        let url = `https://api.crypto-twilight.com/tradingView/index.php?theme=${theme}&interval=${day}&from=${from}&to=${to}&exchange=${exch}&time=${time}`
        const browser = await puppeteer.launch({headless: true});
        const page = await browser.newPage();
        await page.goto(url);
        setTimeout(async ()=>{
            await page.setViewport({width: 1000, height: 500});
            let response = await page.screenshot();
            await bot.sendPhoto(msg.chat.id,response,{caption:`<b><a href="${ads.url}">${ads.text}</a></b>`,disable_web_page_preview:true,parse_mode:"html",reply_to_message_id:msg.message_id})
            await browser.close();
        },500)
        return
    }catch(error){
        console.log(error)
        bot.sendMessage(msg.chat.id,config.error_message,{parse_mode:"html",reply_to_message_id:msg.message_id});
        return
    }
})

bot.onText(/\/mp|\/multi|\/multiple/i,async (msg)=>{
    try{
        bot.sendChatAction(msg.chat.id,"typing")
        let input = msg.text.toLocaleLowerCase()
        if(input=="/mp" || input=="/multi" ||input=="/multiple"){
            coin="BTC,ETH"
        }else{
            coin = input.toLocaleUpperCase().replace(/\s+/gm," ").split(" ")
            coin.shift()
            coin=coin.join(",")
        }
        coin=coin ? coin : "BTC,ETH"
        amt=1
        const data = await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${coin}&tsyms=USDT`)
        let response = await data.json()
        let array = coin.split(",")
        let text="<b>MULTIPLE PRICES</b>\n"
        for(key of array){
            result = response["RAW"][key]["USDT"]
            const TOT_PRICE = (amt * result.PRICE).toFixed(6)
            const HIGH24HOUR = result.HIGH24HOUR.toFixed(3)
            const LOW24HOUR = result.LOW24HOUR.toFixed(3)
            const CHANGEPCTHOUR = result.CHANGEPCTHOUR.toFixed(2)
            const CHANGEPCT24HOUR = result.CHANGEPCT24HOUR.toFixed(2)
            const MKTCAP = millify(result.MKTCAP, {
                precision: 2
            });
            const SUPPLY = millify(result.SUPPLY, {
                precision: 2
            });
            text += `<code>\n${amt} ${key}: ${TOT_PRICE} USDT\nHIGH 24H: ${HIGH24HOUR}  USDT\nLOW 24H: ${LOW24HOUR}  USDT\n1H: ${CHANGEPCTHOUR}%\n24H: ${CHANGEPCT24HOUR}%\nM-CAP: ${MKTCAP}  USDT\nSUPPLY: ${SUPPLY}  ${key}</code>\n`
        }
        bot.sendMessage(msg.chat.id,`${text}<b><a href="${ads.url}">${ads.text}</a></b>`,{parse_mode:"html",reply_to_message_id:msg.message_id,disable_web_page_preview:true,reply_to_message_id:msg.message_id})
        return
    }catch(error){
        console.log(error)
        bot.sendMessage(msg.chat.id,config.error_message,{parse_mode:"html",reply_to_message_id:msg.message_id});
        return
    }
})

bot.onText(/\/gas/i,async (msg)=>{
    try{
        bot.sendChatAction(msg.chat.id,"typing")
        const data = await fetch("https://ethgasstation.info/json/ethgasAPI.json")
        const response = await data.json()
        const safelow = parseInt(response.safeLow)/10;
        const avg = parseInt(response.average)/10;
        const fast = parseInt(response.fast)/10;
        const fastest = parseInt(response.fastest)/10;
        const text = `<b>🔆 Ethereum Gas Price\n🚁 Safe Low :</b> <code>${safelow} Gwei &lt; 30m</code>\n<b>✈️ Average :</b> <code>${avg} Gwei &lt; 5m</code>\n<b>🚀 Fast :</b> <code>${fast} Gwei &lt; 2m</code>\n<b>🛰️ Fastest :</b> <code>${fastest} Gwei &lt; 30s</code>\n<b><a href='${ads.url}'>${ads.text}</a></b>`
        bot.sendMessage(msg.chat.id,text,{parse_mode:"html",disable_web_page_preview:true,reply_to_message_id:msg.message_id})
        return;
    }catch(error){
        console.log(error)
        bot.sendMessage(msg.chat.id,config.error_message,{parse_mode:"html",reply_to_message_id:msg.message_id});
        return
    }
})

bot.onText(/\/txfee/,async (msg)=>{
    try{
        const data = await fetch("https://bitcoiner.live/api/fees/estimates/latest")
        const obj = await data.json()
        const s = obj.estimates["30"].sat_per_vbyte;
        const usd = (obj.estimates["30"].total.p2wpkh.usd).toFixed(2)
        const ss = obj.estimates["60"].sat_per_vbyte;
        const usdd = (obj.estimates["60"].total.p2wpkh.usd).toFixed(2)
        const sss = obj.estimates["120"].sat_per_vbyte;
        const usddd = (obj.estimates["120"].total.p2wpkh.usd).toFixed(2)
        const text = `<b>🚀 Fast :</b> <code>${s} sat/vB [$${usd}]</code>\n<b>🏍️ Avg :</b> <code>${ss} sat/vB [$${usdd}]</code>\n<b>🚲 Slow :</b> <code>${sss} sat/vB [$${usddd}]</code>\n<b><a href='${ads.url}'>${ads.text}</a></b>`
        bot.sendMessage(msg.chat.id, text , {parse_mode:"html",disable_web_page_preview:true,reply_to_message_id:msg.message_id})
        return
    }catch(error){
        console.log(error)
        bot.sendMessage(msg.chat.id,config.error_message,{parse_mode:"html",reply_to_message_id:msg.message_id});
        return
    }
})

bot.onText(/\/advertise/,async (msg)=>{
    text = `<code>Contact Us : </code><b>@${config.ADMIN_USERNAME}</b>`
    bot.sendMessage(msg.chat.id,text,{parse_mode:"html",disable_web_page_preview:true,reply_to_message_id:msg.message_id})
    return
})

bot.onText(/\/calc/,async (msg)=>{
    try{
        bot.sendChatAction(msg.chat.id,"typing")
        let data = msg.text.toLocaleLowerCase()
        let amt
        let coin
        if(data=="/calc"){
            amt = 1
            coin = "BTC"
        }else{
            coin = data.toLocaleUpperCase().replace(/\s+/gm," ").split(" ")
            coin.shift()
            if(!coin[1]){
                if(!isNaN(coin[0])){
                    amt = parseFloat(coin[0])
                    coin = "BTC"
                }else{
                    amt = 1
                    coin = coin[0] ?? "BTC"
                }
            }else{
                if(isNaN(coin[0]) && isNaN(coin[1])){
                    amt = 1
                    coin = coin[0]
                }else if(isNaN(coin[0]) && !isNaN(coin[1])){
                    amt = parseFloat(coin[1])
                    coin = coin[0]
                }else if(!isNaN(coin[0]) && isNaN(coin[1])){
                    amt = parseFloat(coin[0])
                    coin = coin[1]
                }else if(!isNaN(coin[0]) && !isNaN(coin[1])){
                    amt = parseFloat(coin[0])
                    coin = "BTC"
                }else{
                    amt = 1
                    coin = "BTC"
                }
            }
        }
        let res = await fetch(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${coin}&tsyms=USD,BTC,ETH,LTC,BNB,INR`)
        let result = await res.json()
        let amount = amt.toFixed(6)
        let USD = (result[coin]["USD"]).toFixed(6)
        let ETH = (result[coin]["ETH"]).toFixed(6)
        let LTC = (result[coin]["LTC"]).toFixed(6)
        let BNB = (result[coin]["BNB"]).toFixed(6)
        let INR = (result[coin]["INR"]).toFixed(6)
        let key = [[{"text":"▲ x2.0" , "callback_data":`/calc ${coin} ${amt} 2`},{"text":"🔄" , "callback_data":`/calc ${coin} ${amt} 1`},{"text":"▼ x0.5" , "callback_data":`/calc ${coin} ${amt} 0.5`}]]
        let text = `<code>${amount} ${coin} = ?\n\nUSD : ${USD}\nETH : ${ETH}\nLTC : ${LTC}\nBNB : ${BNB}\nINR : ${INR}\n</code>\n<b><a href='${ads.url}'>${ads.text}</a></b>`;
        bot.sendMessage(msg.chat.id,text,{reply_markup:{inline_keyboard:key},parse_mode:"html",disable_web_page_preview:true,reply_to_message_id:msg.message_id})
        let timer = Math.floor(new Date().getTime()/1000)
        await auth.user.updateOne({chat_id:msg.chat.id},{$set:{timer:timer+60}})
        return
    }catch(error){
        console.log(error)
        bot.sendMessage(msg.chat.id,config.error_message,{parse_mode:"html",reply_to_message_id:msg.message_id});
        return
    }
})

bot.onText(/\/bio|\/desc|\/decription|describe/i,async (msg)=>{
    try{
        bot.sendChatAction(msg.chat.id,"typing")
        let input = msg.text.toLocaleLowerCase()
        if(input=="/bio" || input=="/desc" || input=="/description" || input=="/describe"){
            coin="BTC"
        }else{
            coin=input.toLocaleUpperCase().replace(/\s+/gm," ").split(" ")
            coin.shift()
            coin=coin[0] ?? "BTC"
        }
        let res = await fetch(`https://min-api.cryptocompare.com/data/all/coinlist`)
        let response = await res.json()
        let desc = response.Data[coin].Description
        bot.sendMessage(msg.chat.id,desc,{parse_mode:"HTML",reply_to_message_id:msg.message_id})
        return
    }catch(error){
        console.log(error)
        bot.sendMessage(msg.chat.id,config.error_message,{parse_mode:"html",reply_to_message_id:msg.message_id});
        return
    }
})

bot.onText(/\/select/i,async (msg)=>{
    if(msg.text.toLowerCase() == "/select"){
        const text = "<i>❌ Invalid format\n\n/select {winner count} {userIDs/UserNames}\n\nNote : UserIDs/UserNames seperate with spaces.</i>"
        bot.sendMessage(msg.chat.id, text , {parse_mode:"HTML",disable_web_page_preview:true,reply_to_message_id:msg.message_id})
        return
    }
    const params = msg.text.replace(/\s+/gm," ").split(" ")
    params.shift()
    if(isNaN(params[0])){
        const text = "<i>❌ Invalid format\n\n/select {winner count} {userIDs/UserNames}\n\nNote : UserIDs/UserNames seperate with spaces.</i>"
        bot.sendMessage(msg.chat.id, text , {parse_mode:"HTML",disable_web_page_preview:true,reply_to_message_id:msg.message_id})
        return
    }
    const winners = params[0]
    params.shift()
    if(winners>params.length){
        const text = "<i>❌ Winner count is greater than total users</i>"
        bot.sendMessage(msg.chat.id, text , {parse_mode:"HTML",disable_web_page_preview:true,reply_to_message_id:msg.message_id})
        return
    }
    if(winners<1){
        const text = "<i>❌ Minimum 1 winner is requred!</i>"
        bot.sendMessage(msg.chat.id, text , {parse_mode:"HTML",disable_web_page_preview:true,reply_to_message_id:msg.message_id})
        return
    }
    let users = shuffle(params)
    let i=0
    let text = "🛸 Random winners by "+config.BOT_NAME
    while(i<winners){
        text += "\n"+(i+1)+" ➜ "+users[i]+""
        i++
    }
    function shuffle(array){
        for(let i=0;i<array.length;i++){
            const random = Math.floor(Math.random() * array.length)
            let temp = array[i]
            array[i] = array[random]
            array[random] = temp
        }
        return array
    }
    bot.sendMessage(msg.chat.id,text,{parse_mode:"HTML",disable_web_page_preview:true,reply_to_message_id:msg.message_id})
    return
})

bot.onText(/\/quote/,async (msg)=>{
    const data = await fetch("https://type.fit/api/quotes")
    const response = await data.json()
    const index = Math.floor(Math.random() * response.length)
    const quote = response[index].text
    const auth = response[index].author ?? "Unknown"
    const text = `<code>${quote}\n- ${auth}</code>`
    bot.sendMessage(msg.chat.id,text,{parse_mode:"HTML",disable_web_page_preview:true,reply_to_message_id:msg.message_id})
    return
})

bot.onText(/\/broadcast/i,async (msg)=>{
    try{
        bot.sendChatAction(msg.chat.id,"typing")
        if(msg.chat.id != process.env.ADMIN_ID){
            return
        }
        const users = await auth.user.find({chat_type:"private"}).toArray()
        let count=0
        for(user of users){
            bot.sendMessage(user.chat_id,"Hi")
            count++
        }
        bot.sendMessage(process.env.ADMIN_ID,"<b>✅ Broadcasted to : </b><code>"+count+"</code>",{parse_mode:"html"})
    }catch(error){
        console.log(error)
        bot.sendMessage(msg.chat.id,config.error_message,{parse_mode:"html",reply_to_message_id:msg.message_id});
        return
    }
})


bot.on("callback_query",async (msg)=>{
    const action = msg.data.split(" ")

    if(action[0]=="/p"){
        try{
            bot.sendChatAction(msg.message.chat.id,"typing")
            let timer = await auth.user.findOne({chat_id:msg.message.chat.id})
            let now = Math.floor(new Date().getTime()/1000)
            let sec =timer.timer - now
            if(sec >= 0){
                bot.answerCallbackQuery(msg.id, {text: `Wait ${sec} seconds!`})
                return
            }
            let amt = action[1]
            let fr = action[2]
            let to = action[3]
            let response = await fetch(`https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${fr}&tsyms=${to}`)
            let result = await response.json()
            result = result["RAW"][fr][to]
            const TOT_PRICE = (amt * result.PRICE).toFixed(6)
            const HIGH24HOUR = result.HIGH24HOUR.toFixed(3)
            const LOW24HOUR = result.LOW24HOUR.toFixed(3)
            const CHANGEPCTHOUR = result.CHANGEPCTHOUR.toFixed(2)
            const CHANGEPCT24HOUR = result.CHANGEPCT24HOUR.toFixed(2)
            const MKTCAP = millify(result.MKTCAP, {
                precision: 2
            });
            const SUPPLY = millify(result.SUPPLY, {
                precision: 2
            });
            const text = `<code>${amt} ${fr}: ${TOT_PRICE} ${to}\nHIGH 24H: ${HIGH24HOUR}  ${to}\nLOW 24H: ${LOW24HOUR}  ${to}\n1H: ${CHANGEPCTHOUR}%\n24H: ${CHANGEPCT24HOUR}%\nM-CAP: ${MKTCAP}  ${to}\nSUPPLY: ${SUPPLY}  ${fr}</code>\n<b><a href='${ads.url}'>${ads.text}</a></b>`
            const key = [[{"text":"🔄 Refresh","callback_data":`/p ${amt} ${fr} ${to}`}]]
            bot.editMessageText(text,{chat_id:msg.message.chat.id,message_id:msg.message.message_id,reply_markup:{inline_keyboard:key},parse_mode:"html",disable_web_page_preview:true})
            let newtimer = Math.floor(new Date().getTime()/1000)
            await auth.user.updateOne({chat_id:msg.message.chat.id},{$set:{timer:newtimer+60}})
            return
        }catch(error){
            console.log(error)
            bot.answerCallbackQuery(msg.id, {text: `❌ Error Happend!`})
            return
        }
    }

    if(action[0]=="/calc"){
        try{
            bot.sendChatAction(msg.message.chat.id,"typing")
            let coin = action[1]
            let amt = parseFloat(action[2]) * parseFloat(action[3])
            if(action[3]==1){
                let timer = await auth.user.findOne({chat_id:msg.message.chat.id})
                let now = Math.floor(new Date().getTime()/1000)
                let sec =timer.timer - now
                if(sec >= 0){
                    bot.answerCallbackQuery(msg.id, {text: `Wait ${sec} seconds!`})
                    return
                }
            }
            let res = await fetch(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${coin}&tsyms=USD,BTC,ETH,LTC,BNB,INR`)
            let result = await res.json()
            let amount = amt.toFixed(6)
            let USD = (result[coin]["USD"] * amount).toFixed(6)
            let ETH = (result[coin]["ETH"] * amount).toFixed(6)
            let LTC = (result[coin]["LTC"] * amount).toFixed(6)
            let BNB = (result[coin]["BNB"] * amount).toFixed(6)
            let INR = (result[coin]["INR"] * amount).toFixed(6)
            let key = [[{"text":"▲ x2.0" , "callback_data":`/calc ${coin} ${amt} 2`},{"text":"🔄" , "callback_data":`/calc ${coin} ${amt} 1`},{"text":"▼ x0.5" , "callback_data":`/calc ${coin} ${amt} 0.5`}]]
            let text = `<code>${amount} ${coin} = ?\n\nUSD : ${USD}\nETH : ${ETH}\nLTC : ${LTC}\nBNB : ${BNB}\nINR : ${INR}\n</code>\n<b><a href='${ads.url}'>${ads.text}</a></b>`;
            bot.editMessageText(text,{chat_id:msg.message.chat.id,message_id:msg.message.message_id,reply_markup:{inline_keyboard:key},parse_mode:"html",disable_web_page_preview:true})
            return
        }catch(error){
            console.log(error)
            bot.answerCallbackQuery(msg.id, {text: `❌ Error Happend!`})
            return
        }
    }

})

