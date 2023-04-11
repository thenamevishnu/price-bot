require("dotenv").config()
const mongoose = require("mongoose")
mongoose.set("strictQuery",false)
const url = process.env.CONNECTION
mongoose.connect(url).then(Response=>{
    console.log("Database connection success!");
})