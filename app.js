const express=require("express");
const bodyParser=require("body-parser");
const mongoose=require("mongoose")
const crypto=require("crypto");
const nodemailer=require("nodemailer")
const dotEnv=require("dotenv");
const { error } = require("console");
const jwt =require("jsonwebtoken")

const User=require("./models/User")
const orders=require("./models/Orders")

const app=express()



dotEnv.config()

const PORT=process.env.PORT||4000;

app.listen(PORT,()=>{
    console.log(`server started and running and ${PORT}` )


})

console.log(process.env.mongo_url)


mongoose.connect(process.env.mongo_url)
.then(()=>{console.log("mongoDB connected successfully")})
.catch((error)=>console.log(error))

app.use(bodyParser.json())

//function to send verification mail


const sendVerificationEmail=async (email,verificationToken)=>{
    // create a nodemailer transport
    const transporter=nodemailer.createTransport({
        // configure the email service
        service:"gamil",
        auth:{
            user:"bsvvreddy@gmail.com",
            pass:"ylfj pooo gyoe tzjg"
        }
    })

    //compose the email message

    const mailOptions={
        from:"amazon.com",
        to:email,
        subject:"Email Verification",
        text:`Please click the folloing link to verify your email:http://localhost:4000/verify/${verificationToken}`
    }

    //send the Email

    try {
        await transporter.sendMail(mailOptions)
        
    } catch (error) {
        console.log("Error sending verification email",error)

    }
}

app.post("/register",async(req,res)=>{
    try {
        const {name,email,password}=req.body

        // check if the user is already registered

        const existingUser= await User.findOne({email})

        if (existingUser){
            return res.status(400).json({message:"Email already Registered"})
        }

        //Create a new User

        const newUser=new User({name,email,password});

        //Generating the verification token

        newUser.verificationToken=crypto.randomBytes(20).toString("hex")


        // save the user in database

        await newUser.save();


        //send verification email to the user

        sendVerificationEmail(newUser.email,newUser.verificationToken)



        
    } catch (error) {
        console.log("error registering user",error)
        res.status(500).json({massage:"Registration failed"})
        
    }
})


//end point verify the email

app.get("/verify/:token", async (req,res)=>{

    try {
        const token = req.params.token
        //Find the user with the given verification token

        const user= await User.findOne({verificationToken:token});
        if (!user){
            return res.status(404).json({massage:"Invalid Verification token"})
        }

        //mark the user as verified

        User.verified=true,
        User.verificationToken=undefined
        await User.save()

        res.status(200).json({massage:"Email verification successfully"})
        
    } catch (error) {

        res.status(500).json({massage:"Email verification failed"});
        
    }
})