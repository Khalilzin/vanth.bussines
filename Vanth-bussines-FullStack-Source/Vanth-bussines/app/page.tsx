import {redirect} from 'next/navigation';
import {getUser} from '@/lib/auth';
export default async function Page(){redirect(await getUser()?'/app/dashboard':'/login')}
