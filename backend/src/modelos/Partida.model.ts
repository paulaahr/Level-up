
import { Schema, model, Document, Types } from 'mongoose';

export interface IPartida extends Document {
  videojuego: Types.ObjectId;
  fecha: Date;
  duracionMinutos: number;
  porcentajeAvance: number;
  notas: string;
  createdAt: Date;
}

const PartidaSchema = new Schema<IPartida>({
  videojuego: {
    type: Schema.Types.ObjectId,
    ref: 'Videojuego',
    required: [true, 'Selecciona un videojuego']
  },

  fecha: {
    type: Date,
    required: [true, 'La fecha es obligatoria']
  },

  duracionMinutos: {
    type: Number,
    required: [true, 'La duración es obligatoria'],
    min: [1, 'Mínimo un minuto'],
    max: [1440, 'Máximo 1440 minutos por sesión'],
    validate: {
      validator: Number.isInteger,
      message: 'La duración debe expresarse en minutos enteros'
    }
  },

  porcentajeAvance: {
    type: Number,
    required: [true, 'El porcentaje de avance es obligatorio'],
    min: [0, 'El avance no puede ser negativo'],
    max: [100, 'El avance no puede superar el 100%'],
    validate: {
      validator: Number.isFinite,
      message: 'El avance debe ser un número válido'
    }
  },

  notas: {
    type: String,
    trim: true,
    maxlength: [500, 'Las notas no pueden superar los 500 caracteres'],
    default: ''
  }
}, {
  timestamps: true
});

// Optimiza las consultas de partidas por videojuego y fecha
PartidaSchema.index({ videojuego: 1, fecha: -1 });

export const Partida = model<IPartida>('Partida', PartidaSchema);
