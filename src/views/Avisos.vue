<template>
  <div class="p-6 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">🔔 Seus Avisos</h1>

    <div v-if="avisos.length === 0" class="text-gray-500">Nenhum aviso pendente.</div>

    <div v-for="aviso in avisos" :key="aviso.id" class="bg-yellow-100 p-4 mb-4 rounded shadow">
      <p class="text-gray-800">{{ aviso.mensagem }}</p>
      <button @click="marcarComoLido(aviso.id)" class="btn btn-blue mt-2">Marcar como lido</button>
    </div>

    <router-link to="/painel" class="btn btn-gray mt-6">⬅ Voltar ao Painel</router-link>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db, auth } from '../firebase'
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

const avisos = ref([])

onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    if (!u) return (window.location.href = '/login')

    const q = query(collection(db, 'avisos'), where('userId', '==', u.uid), where('lido', '==', false))
    const snap = await getDocs(q)

    avisos.value = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  })
})

const marcarComoLido = async (avisoId) => {
  await updateDoc(doc(db, 'avisos', avisoId), {
    lido: true
  })
  avisos.value = avisos.value.filter(a => a.id !== avisoId)
}
</script>

<style scoped>
.btn {
  @apply px-4 py-2 rounded-lg font-semibold transition-colors;
}
.btn-blue {
  @apply bg-blue-500 text-white hover:bg-blue-600;
}
.btn-gray {
  @apply bg-gray-400 text-white hover:bg-gray-500;
}
</style>
