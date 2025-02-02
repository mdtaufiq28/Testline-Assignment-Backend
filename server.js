import http from 'http';

http.createServer(async (req,res)=>{

    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    res.setHeader('Access-Control-Allow-Credentials','true');

    if(req.method==='OPTIONS'){
        res.writeHead(204);
        res.end();
        return;
    }

    if(req.url==='/fetchQuestions'){
       console.log('Connected to Server');
       const responseObj=await fetch('https://api.jsonserve.com/Uw5CrX');
       const response=await responseObj.json();
       const result=JSON.stringify(response);
       console.log(result);
       res.end(result);
    }
}).listen(3000);

