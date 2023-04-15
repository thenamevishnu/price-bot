const mongoose = require("mongoose")

const users = new mongoose.Schema({
    chat_id:{
        type:Number,
        required:true,
    },
    chat_type:{
        type:String,
        required:true
    },
    first_name:{
        type:String,
        required:true
    },
    last_name:{
        type:String,
        required:true
    },
    username:{
        type:String,
        required:true
    },
    balance:{
        type:Number,
        required:true,
        default:0
    },
    timer:{
        type:Number,
        required:true
    },
    pro:{
        type:Boolean,
        required:true
    }
})

const user = mongoose.model("users",users).collection

module.exports = {
    user
}