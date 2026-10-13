import {Schema,model,Document,Types} from 'mongoose';
export const generos=['Acción','Aventura','RPG','Indie','Estrategia','Simulación','Deportes','Terror','Plataformas','Otro'] as const;
export const estados=['Pendiente','Jugando','Completado','En pausa'] as const;
export interface ILogro { _id:Types.ObjectId; nombre:string; descripcion?:string; obtenido:boolean; }
export interface IVideojuego extends Document {nombre:string; genero:string; plataforma:string; estado:string; portada:string; descripcion:string; calificacion?:number; logros:Types.DocumentArray<ILogro>; createdAt:Date;updatedAt:Date;}
const LogroSchema=new Schema<ILogro>({nombre:{type:String,required:true,trim:true,maxlength:100},descripcion:{type:String,trim:true,maxlength:250,default:''},obtenido:{type:Boolean,default:false}});
const VideojuegoSchema=new Schema<IVideojuego>({
 nombre:{type:String,required:[true,'El nombre es obligatorio'],trim:true,minlength:2,maxlength:120},
 genero:{type:String,enum:generos,required:true},
 plataforma:{type:String,required:true,trim:true,maxlength:80},
 estado:{type:String,enum:estados,default:'Pendiente'},
 portada:{type:String,trim:true,default:''},descripcion:{type:String,trim:true,maxlength:1000,default:''},
 calificacion:{type:Number,min:0,max:10},
 logros:{type:[LogroSchema],default:[]}
},{timestamps:true});
export const Videojuego=model<IVideojuego>('Videojuego',VideojuegoSchema);
