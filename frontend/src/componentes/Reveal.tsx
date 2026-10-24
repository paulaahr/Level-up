import {useEffect,useRef,useState, type CSSProperties, type ReactNode} from 'react';
export function Reveal({children,className='',delay=0,style}:{children:ReactNode;className?:string;delay?:number;style?:CSSProperties}){
 const ref=useRef<HTMLDivElement>(null);const [visible,setVisible]=useState(false);
 useEffect(()=>{const node=ref.current;if(!node)return; if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setVisible(true);return}const obs=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setVisible(true);obs.unobserve(entry.target)}},{threshold:.12,rootMargin:'0px 0px -35px 0px'});obs.observe(node);return()=>obs.disconnect()},[]);
 return <div ref={ref} className={`reveal-block ${visible?'is-visible':''} ${className}`} style={{...style,'--reveal-delay':`${delay}ms`} as CSSProperties}>{children}</div>
}
