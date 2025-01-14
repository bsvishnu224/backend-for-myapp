const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose")
const crypto = require("crypto");
const nodemailer = require("nodemailer")
const dotEnv = require("dotenv");
const { error } = require("console");
const jwt = require("jsonwebtoken")

const User = require("./models/User")

const Order = require("./models/Orders");

const app = express()



dotEnv.config()

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`server started and running and ${PORT}`)


})

console.log(process.env.mongo_url)


mongoose.connect(process.env.mongo_url)
    .then(() => { console.log("mongoDB connected successfully") })
    .catch((error) => console.log(error))

app.use(bodyParser.json())

//function to send verification mail


const sendVerificationEmail = async (email, verificationToken) => {
    console.log(email)
    // create a nodemailer transport
    const transporter = nodemailer.createTransport({
        // configure the email service
        service: "gmail",
        auth: {
            user: "bsvvreddy@gmail.com",
            pass: "ylfjpooogyoetzjg"
        }
    })

    //compose the email message

    const mailOptions = {
        from: "amazon.com",
        to: email,
        subject: "Email Verification",
        text: `Please click the folloing link to verify your email:https://backend-for-myapp.onrender.com/verify/${verificationToken}`
    }

    //send the Email

    try {
        await transporter.sendMail(mailOptions)

    } catch (error) {
        console.log("Error sending verification email", error)

    }
}

app.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body

        // check if the user is already registered

        const existingUser = await User.findOne({ email })

        if (existingUser) {
            return res.status(400).json({ message: "Email already Registered" })
        }

        //Create a new User

        const newUser = new User({ name, email, password });

        //Generating the verification token

        newUser.verificationToken = crypto.randomBytes(20).toString("hex")


        // save the user in database

        await newUser.save();



        //send verification email to the user

        sendVerificationEmail(newUser.email, newUser.verificationToken)


        res.status(201).json({
            message:
                "Registration successful. Please check your email for verification.",
        });

    } catch (error) {
        console.log("error registering user", error)
        res.status(500).json({ massage: "Registration failed" })

    }
})


//end point verify the email

app.get("/verify/:token", async (req, res) => {


    try {
        const token = req.params.token
        console.log(token)
        //Find the user with the given verification token

        const user = await User.findOne({ verificationToken: token });
        console.log(user)
        if (!user) {
            return res.status(404).json({ massage: "Invalid Verification token" })
        }

        //mark the user as verified

        user.verified = true,

            user.verificationToken = undefined
        await user.save()
        console.log(user)

        res.status(200).json({ massage: "Email verification successfully" })

    } catch (error) {

        res.status(500).json({ massage: "Email verification failed" });

    }
})


const generateSecreteKey = () => {
    const secretKey = crypto.randomBytes(32).toString("hex")
    return secretKey
}


const secretKey = generateSecreteKey()

//endPoint to login the user.

app.post("/login", async (req, res) => {

    try {
        const { email, password } = req.body
        console.log(email, password)

        //check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ massage: "Invalid Email or Password" })

        }
        //check the password is correct

        if (user.password !== password) {
            return res.status(401).json({ message: "Invalid Password" })
        }

        //Generating a Token

        const token = jwt.sign({ userId: user._id }, secretKey)

        res.status(200).json({ token })










    } catch (error) {
        res.status(500).json({ message: "Login Failed" })

    }
})


//endpiont to store a new address to the backend

app.post("/addresses", async (req, res) => {
    try {
        const { userId, address } = req.body
        console.log(address)


        //find the user by using userId

        const user = await User.findById(userId)
        console.log(user)
        if (!user) {
            return res.status(404).json({ messsage: "user not found" })
        }
        //add the new address to the user's addresses array
        user.addresses.push(address)

        //save the updateduser in the backend
        await user.save()

        res.status(200).json({ message: "address added successfully" })

    } catch (error) {
        res.status(500).json({ message: "error adding addresses" })
        console.log(error)
    }
})

// endponit to get all addresses of a perticular user

app.get("/addresses/:userId", async (req, res) => {
    try {
        const userId = req.params.userId
        const user = await User.findById(userId)

        if (!user) {
            return res.status(404).json({ message: "user not Found" })

        }

        const addresses = user.addresses
        res.status(200).json(addresses)


    } catch (error) {
        res.json(500).json({ message: "error retrieveing addresses" })
    }
})

//endpiont to store all the orders

app.post("/orders", async (req, res) => {
    try {
        const { userId, cartItems, totalPrice, shippingAddress, paymentMethod } = req.body
        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ message: "user not found" })

        }

        //create an array of produte objects from the cart Items
        const products = cartItems.map((item) => ({
            name: item.title,
            quantity: item.quantity,
            price: item.price,
            iamge: item.image
        }))

        //create a new order

        const order = new Order({
            user: userId,
            products: products,
            totalPrice: totalPrice,
            shippingAddress: shippingAddress,
            paymentMethod: paymentMethod
        })

        await order.save()

        res.status(200).json({ message: "order create successfully" })

    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Error creating orders" })
    }
})


//get the user profile;

app.get("/profile/:userId", async (req, res) => {
    try {
        const userId = req.params.userId

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ message: "user not found" })

        }

        res.status(200).json({ user })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Error retrieving the user profile" })
    }
})


//get orders 

app.get("/orders/:userId", async (req, res) => {
    try {
        const userId = req.params.userId

        const orders = await Order.find({ user: userId }).populate("user");

        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: "No orders found for this user" })
        }

        res.status(200).json({ orders })

    } catch (error) {
        res.status(500).json({ message: "Error" })
        console.log(error)

    }
})