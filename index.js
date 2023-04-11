require("dotenv").config()
const db = require("./connection")
const auth = require("./model")
const config = require("./config")
const millify = require("millify").millify
const fetch = require("node-fetch")
const Telegram = require("node-telegram-bot-api")


const bot = new Telegram(process.env.BOT_TOKEN,{polling:true})

let rand = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}
let ads = config.ADS[rand(0,0)]

bot.onText(/\/start/,async (msg)=>{
    try{
        const chat_id = msg.chat.id
        const text = `<b>Hi ${msg.chat.first_name} 👋
        I am ${config.BOT_USERNAME}
        I can help you get the crypto data just by command!</b>`
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
            bot.sendMessage(process.env.ADMIN_ID,`<b>TOTAL_USER : </b><code>[${total}]</code>\n\n<b>FIRST_NAME : <a href="tg://user?id=${msg.chat.id}">${name}</a>\nCHAT_ID : </b><code>@${msg.chat.username}</code>\nCHAT_ID : </b><code>${msg.chat.id}</code>`,{parse_mode:"html"})
        }
        return
    }catch(error){
        console.log(error);
        bot.sendMessage(process.env.ADMIN_ID,`<b>❌ Error Happend!\n\nCommand /broadcast\nBy : <a href="tg://user?id=${msg.chat.id}">${msg.chat.first_name}</a></b>`,{parse_mode:"html",disable_web_page_preview:true})
        bot.sendMessage(msg.chat.id,`<i>❌ Error Happend!</i>`,{parse_mode:"html"});
        return
    }
})

bot.onText(/\/p|\/price/i,async (msg)=>{
    try{
        let data = msg.text;
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
        bot.answerCallbackQuery(msg.id, {text: `<i>❌ Error Happend!</i>`})
        bot.sendMessage(process.env.ADMIN_ID,`<b>❌ Error Happend!\n\nCommand /p or /price\nBy : <a href="tg://user?id=${msg.chat.id}">${msg.chat.first_name}</a></b>`,{parse_mode:"html",disable_web_page_preview:true})
        return
    }
    
})

bot.onText(/\/conv|\/convert|\/cnv/i,async (msg)=>{
    try{
        let data = msg.text;
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
        let response = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${fr}&tsyms=${to}`)
        let result = await response.json()
        result = result[to]
        const TOT_PRICE = (amt * result).toFixed(6)
        const text = `<code>${amt} ${fr}: ${TOT_PRICE} ${to}</code>`
        bot.sendMessage(msg.chat.id,text,{reply_to_message_id:msg.message_id,parse_mode:"html",disable_web_page_preview:true})
        return
    }catch(error){
        console.log(error);
        bot.answerCallbackQuery(msg.id, {text: `<i>❌ Error Happend!</i>`})
        bot.sendMessage(process.env.ADMIN_ID,`<b>❌ Error Happend!\n\nCommand /convert or /conv or /cnv\nBy : <a href="tg://user?id=${msg.chat.id}">${msg.chat.first_name}</a></b>`,{parse_mode:"html",disable_web_page_preview:true})
        return
    }
    
})

bot.onText(/\/mp|\/multi|\/multiple/,async (msg)=>{
    try{
        if(msg.text=="/mp" || msg.text=="/multi" || msg.text=="/multiple"){
            coin="BTC,ETH"
        }else{
            coin = msg.text.toLocaleUpperCase().replace(/\s+/gm," ").split(" ")
            coin.shift()
            coin=coin.join(",")
        }
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
        bot.sendMessage(msg.chat.id,`${text}<b><a href="${ads.url}">${ads.text}</a></b>`,{parse_mode:"html",disable_web_page_preview:true})
        return
    }catch(error){
        console.log(error);
        bot.sendMessage(process.env.ADMIN_ID,`<b>❌ Error Happend!\n\nCommand /mp or /multi or /multiple\nBy : <a href="tg://user?id=${msg.chat.id}">${msg.chat.first_name}</a></b>`,{parse_mode:"html",disable_web_page_preview:true})
        return
    }
})



bot.onText(/\/broadcast/,async (msg)=>{
    try{
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
        console.log(error);
        bot.sendMessage(process.env.ADMIN_ID,`<b>❌ Error Happend!\n\nCommand /broadcast\nBy : <a href="tg://user?id=${msg.chat.id}">${msg.chat.first_name}</a></b>`,{parse_mode:"html",disable_web_page_preview:true})
        return
    }
})



bot.on("callback_query",async (msg)=>{
    const action = msg.data.split(" ")

    if(action[0]=="/p"){
        try{
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
            bot.sendMessage(process.env.ADMIN_ID,`<b>❌ Error Happend!\n\nCommand /p or /price callback\nBy : <a href="tg://user?id=${msg.message.chat.id}">${msg.message.chat.first_name}</a></b>`,{parse_mode:"html",disable_web_page_preview:true})
            return
        }
    }
})