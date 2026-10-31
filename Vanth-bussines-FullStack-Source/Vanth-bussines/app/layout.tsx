import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:{default:'Vanth.bussines',template:'%s | Vanth.bussines'},description:'Workspace privado para gestão de projetos, tarefas, notas e eventos.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
