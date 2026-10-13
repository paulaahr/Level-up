const BASE=(import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/,'');
export async function peticion<T>(ruta:string,opciones:RequestInit={}):Promise<T>{
 let respuesta:Response;try{respuesta=await fetch(BASE+ruta,{...opciones,headers:{'Content-Type':'application/json',...opciones.headers}})}catch{throw new Error('No se pudo conectar con la API. Revisa que el backend esté encendido.');}
 if(respuesta.status===204)return undefined as T;
 const data=await respuesta.json().catch(()=>({}));if(!respuesta.ok)throw new Error(data.error || `Error HTTP ${respuesta.status}`);return data as T;
}
