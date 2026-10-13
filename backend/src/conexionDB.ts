import mongoose from 'mongoose';
import { env } from './config/env';

export async function conectarDB(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri, {
      dbName: 'levelup'
    });

    console.log('MongoDB conectado correctamente');
    console.log('Base de datos:', mongoose.connection.name);
    console.log('Host:', mongoose.connection.host);

  } catch (error) {
    console.error('Error al conectar con MongoDB:', error);
    throw error;
  }
  const colecciones = await mongoose.connection.db!.listCollections().toArray();

console.log(
  'Colecciones encontradas:',
  colecciones.map(coleccion => coleccion.name)
);
}