'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
 const [email,setEmail] = useState('')
 const [password,setPassword] = useState('')
 const router = useRouter()

 async function login() {
   const { error } = await supabase.auth.signInWithPassword({
     email,
     password
   })

   if(!error){
     router.push('/admin/dashboard')
   }
 }

 return (
   <div className="min-h-screen flex items-center justify-center bg-black">
     <div className="bg-zinc-900 p-8 rounded-xl w-96">
       <input placeholder="Email"
        className="w-full mb-3 p-2"
        onChange={e=>setEmail(e.target.value)}
       />
       <input type="password"
        placeholder="Senha"
        className="w-full mb-3 p-2"
        onChange={e=>setPassword(e.target.value)}
       />
       <button
        onClick={login}
        className="w-full bg-green-500 p-2 rounded"
       >
        Entrar
       </button>
     </div>
   </div>
 )
}