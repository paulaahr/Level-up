import {conectarDB} from './conexionDB';import {crearApp} from './app';import {env} from './config/env';
conectarDB().then(()=>crearApp().listen(env.puerto,()=>console.log(`LEVEL UP API: http://localhost:${env.puerto}`))).catch(error=>{console.error('No se pudo conectar a MongoDB:',error);process.exit(1)});
