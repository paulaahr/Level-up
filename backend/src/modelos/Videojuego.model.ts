
import { Schema, model, Document, Types } from 'mongoose';

export const generos = [
  'Acción',
  'Aventura',
  'RPG',
  'Indie',
  'Estrategia',
  'Simulación',
  'Deportes',
  'Terror',
  'Plataformas',
  'Otro'
] as const;

export const estados = [
  'Pendiente',
  'Jugando',
  'Completado',
  'En pausa'
] as const;

export interface ILogro {
  _id: Types.ObjectId;
  nombre: string;
  descripcion?: string;
  obtenido: boolean;
}

export interface IVideojuego extends Document {
  nombre: string;
  genero: string;
  plataforma: string;
  estado: string;
  portada: string;
  descripcion: string;
  calificacion?: number;
  logros: Types.DocumentArray<ILogro>;
  createdAt: Date;
  updatedAt: Date;
}

// Evita cadenas vacías o compuestas únicamente por espacios
const textoNoVacio = (valor: string): boolean => {
  return typeof valor === 'string' && valor.trim().length > 0;
};

// Logros embebidos dentro de Videojuego
const LogroSchema = new Schema<ILogro>({
  nombre: {
    type: String,
    required: [true, 'El nombre del logro es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede superar los 100 caracteres'],
    validate: {
      validator: textoNoVacio,
      message: 'El nombre del logro no puede estar vacío'
    }
  },

  descripcion: {
    type: String,
    trim: true,
    maxlength: [250, 'La descripción no puede superar los 250 caracteres'],
    default: ''
  },

  obtenido: {
    type: Boolean,
    default: false
  }
});

// Modelo principal de videojuegos
const VideojuegoSchema = new Schema<IVideojuego>({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
    maxlength: [120, 'El nombre no puede superar los 120 caracteres'],
    validate: {
      validator: textoNoVacio,
      message: 'El nombre del videojuego no puede estar vacío'
    }
  },

  genero: {
    type: String,
    enum: {
      values: generos,
      message: 'El género seleccionado no es válido'
    },
    required: [true, 'El género es obligatorio']
  },

  plataforma: {
    type: String,
    required: [true, 'La plataforma es obligatoria'],
    trim: true,
    maxlength: [80, 'La plataforma no puede superar los 80 caracteres'],
    validate: {
      validator: textoNoVacio,
      message: 'La plataforma no puede estar vacía'
    }
  },

  estado: {
    type: String,
    enum: {
      values: estados,
      message: 'El estado seleccionado no es válido'
    },
    default: 'Pendiente'
  },

  portada: {
    type: String,
    trim: true,
    default: ''
  },

  descripcion: {
    type: String,
    trim: true,
    maxlength: [1000, 'La descripción no puede superar los 1000 caracteres'],
    default: ''
  },

  calificacion: {
    type: Number,
    min: [0, 'La calificación mínima es 0'],
    max: [10, 'La calificación máxima es 10'],
    validate: {
      validator: Number.isFinite,
      message: 'La calificación debe ser un número válido'
    }
  },

  logros: {
    type: [LogroSchema],
    default: []
  }
}, {
  timestamps: true
});

export const Videojuego = model<IVideojuego>(
  'Videojuego',
  VideojuegoSchema
);

