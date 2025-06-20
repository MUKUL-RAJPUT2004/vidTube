import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },

        email: {
            type : String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        fullname: {
            type: String,
            required: true,
            trim: true,
            index: true, 
        },

        avatar: {
            type: String, //cloudinary url
            required: true,
        },

        coverImage: {
            type: String, //cloudinary url
        },
        
        watchHistory: [
            {
            type: Schema.Types.ObjectId,
            ref: "Video"  
        }
    ],

        password: {
            type: String,
            required: [true, "Password is required"]   //2nd for if its not filled it will be shown to frontend
        },

        refreshToken: {
            type: String
        }

    },
    {timestamps: true}
)

userSchema.pre("save", async function (next){
    if(!this.isModified("password")) return next()

    this.password = await bcrypt.hash(this.password, 10); //runs when we save password and update it later, rest it dont get executed

    next()
})

//checks password
userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password)
}


//dont get stored in npm rnpm db
userSchema.methods.generateAccessToken = function(){
    //short lived access token
    return jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullname: this.fullname
    },
        process.env.ACCESS_TOKEN_SECRET,    //payLoad
        {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
    )
}


//stored in db
userSchema.methods.generateRefreshToken = function(){
    //short lived access token
    return jwt.sign({
        _id: this._id,
    },
        process.env.REFRESH_TOKEN_SECRET,    
        {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
    )
}

export const User = mongoose.model("User", userSchema)      //name with uppercase format and singular manner    
