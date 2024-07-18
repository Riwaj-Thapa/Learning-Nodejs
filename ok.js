const express = require('express');
const cors = require('cors');
const bodyParser = require('body-praser');
const CrytoJS = require('crypto-js');


const app = express();

app.use(cors());

app.use(bodyParser.json({limit:'50mb'}))
app.use(bodyParser.urlencode({limit:'50mb',extended:true}));

app.get('/',(req,res)=>{
    res.send("ding ding");
})

module.exports = app;