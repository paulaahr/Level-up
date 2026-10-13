
import mongoose from 'mongoose';
import { env } from './config/env';

export async function conectarDB(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri, {
      dbName: 'levelup'
    });

    console.log('MongoDB conectado correctamente');
    console.log('Base de datos:', mongoose.connection.name);

  } catch (error) {
    console.error('Error al conectar con MongoDB:', error);
    throw error;
  }
}
