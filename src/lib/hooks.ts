import { useEffect, useState } from 'react'
import { auth, db, appId } from './firebase'
import { onAuth, signInGoogle, signOutUser } from './firebase'
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore'

export function useAuthUser() {
  const [user, setUser] = useState<any>(null)
  useEffect(() => onAuth(setUser), [])
  return {
    user,
    signIn: signInGoogle,
    signOut: () => signOutUser(),
  }
}

export function useSettings(user: any) {
  const [settings, setSettings] = useState<any>({
    monthlyGoal: 0,
    estimatedMonthlyPoints: 0,
    lastGeneratedDate: null,
  })

  useEffect(() => {
    if (!user) return
    const ref = doc(db, `artifacts/${appId}/users/${user.uid}/settings/main`)
    return onSnapshot(ref, s => {
      if (s.exists()) setSettings(prev => ({ ...prev, ...s.data() }))
    })
  }, [user?.uid])

  const save = async (partial: any) => {
    if (!user) return
    const ref = doc(db, `artifacts/${appId}/users/${user.uid}/settings/main`)
    await setDoc(ref, partial, { merge: true })
  }
  return { settings, save }
}

export function useTasks(user: any, depKey?: string) {
  const [tasks, setTasks] = useState<any[]>([])
  useEffect(() => {
    if (!user) return
    const coll = collection(db, `artifacts/${appId}/users/${user.uid}/tasks`)
    return onSnapshot(coll, snap =>
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)))
    )
  }, [user?.uid, depKey])
  return tasks
}
