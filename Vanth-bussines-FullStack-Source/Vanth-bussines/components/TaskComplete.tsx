'use client';
import {useRouter} from 'next/navigation';
export default function TaskComplete({id}:{id:string}){const router=useRouter();return <input className="check-control" type="checkbox" aria-label="Concluir tarefa" onChange={async()=>{const r=await fetch('/api/tasks',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status:'done'})});if(r.ok)router.refresh()}}/>}
