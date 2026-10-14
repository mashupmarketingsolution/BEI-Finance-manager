// cPanel/Passenger startup; the application root stays outside the public document root.
require('dotenv').config({path:require('node:path').join(__dirname,'.env'),quiet:true});
process.env.NODE_ENV=process.env.NODE_ENV||'production';
if(!process.env.DATABASE_URL||!process.env.JWT_SECRET){
 require('node:http').createServer((req,res)=>{res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('BE Interior Finance Manager: server configuration is incomplete.');}).listen(process.env.PORT||3000);
}else{
 const {app}=require('./server');app.listen(process.env.PORT||3000);
}
