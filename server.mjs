import {createAppServer} from './src/local-ai-server.mjs';
const app=createAppServer({port:Number(process.env.PORT||3000)});
console.log('Lighting App 2: '+await app.start());
