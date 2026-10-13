import 'dotenv/config';
const uri=process.env.MONGODB_URI;
if (!uri) throw new Error('Falta MONGODB_URI. Copia .env.example a .env.');
export const env={mongodbUri:uri,mongodbDb:process.env.MONGODB_DB || 'level_up',puerto:Number(process.env.PORT || 3000),frontendUrl:process.env.FRONTEND_URL || 'http://localhost:5173'};
