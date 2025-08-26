import { db } from '../firebase'
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore'

export const registrarEstatistica = async (userId, peladaId, gols, assistencias) => {
  await addDoc(collection(db, 'estatisticas'), {
    userId,
    peladaId,
    gols,
    assistencias,
    registradoEm: Timestamp.now()
  })
}
