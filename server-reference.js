const http=require('http');
const {connectDB}=require('./db');
const PORT=8080;
const url=require('url');
const bcrypt=require('bcrypt');
const crypto=require('crypto');
const cookie=require('cookie');
const cookieParser = require('cookie-parser');
let userDB;
let userAccountDetailsCollection;
let sessionDetailsCollection;
connectDB().then((dbDetails)=>{
    userDB=dbDetails.userDB;
    userAccountDetailsCollection=dbDetails.userAccountDetailsCollection;
    sessionDetailsCollection=dbDetails.sessionDetailsCollection;
}).then(()=>{
startServer();
})

function generateSessionId(){
    const sessionId=crypto.randomBytes(16).toString('hex');
    return sessionId;
}

function startServer(){
    http.createServer(async function(req,res){
        const link=url.parse(req.url,true);
        console.log(link.pathname);
        
        res.setHeader('Access-Control-Allow-Origin', '*');  // Allow requests from any origin
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');  // Allow specific methods
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Credentials', 'true');  // Allow Content-Type header

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
    
        if(req.url=='/login' && req.method=='POST'){
            let body='';
            req.on('data',(dataChunk)=>{
                body+=dataChunk.toString();
            });
            req.on('end',()=>{
                loginUser(res,body);
            })
        }
        else if(req.url=='/signup' && req.method=='POST'){
            let body='';
            req.on('data',(dataChunk)=>{
                body+=dataChunk.toString();

            })
            req.on('end',async ()=>{
                registerUser(res,body);
            })
        }
        else if(req.url==='/auth/status'){
            isValidSession(req,res);
        }
        else{
            res.writeHead(404,{'Content-Type':'text/plain'});
            res.end('404');
        }
        }).listen(8080);
}

async function isValidSession(req,res){
    const cookies=cookie.parse(req.headers.cookie);
    console.log(cookies);
}


async function loginUser(res,body){
    const userInput=JSON.parse(body);
    console.log(userInput);
    let matchingAccount;
    matchingAccount=await userAccountDetailsCollection.findOne({emailAddress:userInput.emailAddress})
    console.log(matchingAccount);
    if(!matchingAccount){
        res.writeHead(404,{'Content-Type':'application/json'});
        res.write(JSON.stringify({
            message:'No Account Exists with the such Email Id,Kindly Recheck.'
        }));
        res.end();
        return;
    }
    const hashedPassword=matchingAccount.password;
    console.log('Hashed Password:',hashedPassword);
    const passwordInput=userInput.password;
    console.log('Password Input:',passwordInput);
    console.log(typeof passwordInput,typeof hashedPassword);
    const isPasswordMatch=await bcrypt.compare(passwordInput,hashedPassword);
    console.log(isPasswordMatch);
    if(isPasswordMatch){
        console.log('Password Matched')

        const sessionId=generateSessionId();
        const emailAddress=matchingAccount.emailAddress;
        const sessionDuration=30*60*1000;
        const cookieValue=cookie.serialize('sessionId',sessionId,{
            httpOnly:true,
            maxAge:30*60,
            sameSite:'None'
        });
        console.log('cookie',cookieValue);
        sessionDetailsCollection.insertOne({sessionId:sessionId,emailAddress:emailAddress});
        res.writeHead(200,{
            'Content-Type':'application/json',
            'Set-Cookie':cookieValue
        });
        res.write(JSON.stringify({
            message:'Successfully Logged In'
        }));
        res.end();
        console.log(res);
    }
    else{
        console.log('Password Mismatch');
        res.writeHead(401,{'Content-Type':'application/json'});
        res.write(JSON.stringify({
            message:'Incorrect Password,Please Check Your Password and Enter it Again'
        }));
        res.end();
    }

}

async function registerUser(res,body){
    const userInput=JSON.parse(body);
    const hashedPassword=await hashing(userInput.password);
    const userAccountDetails={
        firstName:userInput.firstName,
        lastName:userInput.lastName,
        emailAddress:userInput.emailAddress,
        userName:userInput.userName,
        password:hashedPassword
    }
    try{
        await insertUserAccountDetails(userAccountDetails);
        res.writeHead(200,{'Content-Type':'application/json'});
        res.write(JSON.stringify({
            message:'User Account Successfully Created'
        }));
        res.end();
    }
    catch(error){
        console.log('from the register user function',error.message);
    
        if(error.message==='User Account Already Exists'){
            res.writeHead(409,{'Content-Type':'application/json'});
            res.write(JSON.stringify({
                message:error.message
            }));
            res.end();
        }
    }
    
}

async function hashing(password){
    try{
        const saltRounds=10;
        const salt=await bcrypt.genSalt(saltRounds);
        const hashedPassword=await bcrypt.hash(password,salt);
        return hashedPassword; 
    }
    catch(error){
        console.log('Error in Hashing:',error)
        return error;
    }
}

async function insertUserAccountDetails(userAccountDetails){
    try{
        const emailAddress=userAccountDetails.emailAddress;
        let matchingUserAccountDetails=await userAccountDetailsCollection.findOne({emailAddress:emailAddress},{emailAddress:1});
        console.log(matchingUserAccountDetails);
        if(matchingUserAccountDetails){
            throw new Error('User Account Already Exists');
        }
        else{
            await userAccountDetailsCollection.insertOne(userAccountDetails);
            console.log('Document Inserted');
        }
    }
    catch(error){
        throw error;
    }    
}
