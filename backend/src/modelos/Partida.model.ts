import {Schema,model,Document,Types} from 'mongoose';
export interface IPartida extends Document { videojuego:Types.ObjectId; fecha:Date; duracionMinutos:number; porcentajeAvance:number; notas:string; createdAt:Date; }
const PartidaSchema=new Schema<IPartida>({
 videojuego:{type:Schema.Types.ObjectId,ref:'Videojuego',required:[true,'Selecciona un videojuego']},
 fecha:{type:Date,required:[true,'La fecha es obligatoria']},
 duracionMinutos:{type:Number,required:true,min:[1,'Mínimo un minuto'],max:[1440,'Máximo 1440 minutos por sesión']},
 porcentajeAvance:{type:Number,required:true,min:0,max:100},
 notas:{type:String,trim:true,maxlength:500,default:''}
},{timestamps:true});
PartidaSchema.index({videojuego:1,fecha:-1});
export const Partida=model<IPartida>('Partida',PartidaSchema);
