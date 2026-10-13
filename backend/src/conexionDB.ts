import mongoose from 'mongoose';
import { env } from './config/env';
export async function conectarDB(){await mongoose.connect(env.mongodbUri,{dbName:env.mongodbDb});console.log('MongoDB conectado');}
