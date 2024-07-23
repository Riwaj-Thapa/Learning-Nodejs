const mongoose = require('mongoose');
const express = require("express");


const app = express();

app.use(express.json());

mongoose.connect('mongodb+srv://rambathapa562:bEqkOF1s4f4uKnnh@riwaj.pz3vkdq.mongodb.net/')
  .then(() => console.log('Connected!'));

const Cat = mongoose.model("Cat",{name: String});


app.post("/cat", (req, res, next)=>{

    const body = req.body;

    const kitty = new Cat({name:body.name});
    res.send("Thank you")

kitty.save().then(()=>console.log("meow"));
})



app.get("/cat", async (req, res, next)=>{
    
const response  = await Cat.find();

    res.send(response)

})

app.listen(4000, () => {
    console.log("http:localhost/4000")
})


