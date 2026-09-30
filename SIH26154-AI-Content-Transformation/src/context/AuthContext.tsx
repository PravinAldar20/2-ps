import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type User = { id: string; email?: string; name: string };
type AuthContextType = { user: User | null; loading: boolean; signIn: (email:string,password:string)=>Promise<void>; signUp:(name:string,email:string,password:string)=>Promise<{needsEmailConfirmation:boolean}>; signOut:()=>Promise<void> };
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{children:React.ReactNode}> = ({children}) => {
  const [user,setUser] = useState<User|null>(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let mounted=true;
    const init=async()=>{ if(isSupabaseConfigured){ const {data}=await supabase.auth.getSession(); if(mounted&&data.session?.user) setUser({id:data.session.user.id,email:data.session.user.email,name:data.session.user.user_metadata?.full_name||data.session.user.email?.split('@')[0]||'Operator'}); } setLoading(false); };
    init();
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{ if(session?.user) setUser({id:session.user.id,email:session.user.email,name:session.user.user_metadata?.full_name||session.user.email?.split('@')[0]||'Operator'}); else setUser(null); });
    return ()=>{mounted=false;subscription.unsubscribe();};
  },[]);
  const signIn=async(email:string,password:string)=>{ if(!isSupabaseConfigured) throw new Error('Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env first.'); const {error}=await supabase.auth.signInWithPassword({email,password}); if(error) throw error; };
  const signUp=async(name:string,email:string,password:string)=>{ if(!isSupabaseConfigured) throw new Error('Configure Supabase in .env first.'); const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}}); if(error) throw error; return {needsEmailConfirmation:!data.session}; };
  const signOut=async()=>{ if(isSupabaseConfigured) await supabase.auth.signOut(); setUser(null); };
  return <AuthContext.Provider value={{user,loading,signIn,signUp,signOut}}>{children}</AuthContext.Provider>;
};
export const useAuth=()=>{const c=useContext(AuthContext); if(!c) throw new Error('AuthProvider missing'); return c;};
