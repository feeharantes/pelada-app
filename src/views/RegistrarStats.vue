<template>
  <div class="max-w-xl mx-auto bg-white shadow p-6 rounded mt-10">
    <h1 class="text-2xl font-bold mb-4">⚽ Estatísticas da Pelada</h1>
    <p class="mb-4 text-gray-600">Registre quantos gols e assistências você fez na última pelada.</p>

    <div class="mb-4">
      <label class="block mb-1 font-medium">Gols</label>
      <input v-model.number="gols" type="number" min="0" class="input" />
    </div>

    <div class="mb-4">
      <label class="block mb-1 font-medium">Assistências</label>
      <input v-model.number="assistencias" type="number" min="0" class="input" />
    </div>

    <button @click="registrar" class="btn btn-blue" :disabled="salvando">
      {{ salvando ? 'Salvando...' : 'Registrar' }}
    </button>

    <p v-if="msg" class="mt-4 text-green-600">{{ msg }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { auth, db } from '../firebase'
import { registrarEstatistica } from '../firebase/ranking'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

const gols = ref(0)
const assistencias = ref(0)
const salvando = ref(false)
const msg = ref('')
let peladaId = ''

onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    if (!u) return window.location.href = '/login'

    const snap = await getDocs(collection(db, 'peladas'))
    snap.forEach(p => {
      const fim = p.data().data.toDate()
      fim.setHours(fim.getHours() + 2)
      if (new Date() >= fim) {
        peladaId = p.id
      }
    })
  })
})

const registrar = async () => {
  salvando.value = true
  const user = auth.currentUser
  await registrarEstatistica(user.uid, peladaId, gols.value, assistencias.value)
  msg.value = 'Estatísticas registradas com sucesso!'
  salvando.value = false
}
</script>

<style scoped>
.input {
  @apply w-full border px-3 py-2 rounded;
}
.btn-blue {
  @apply bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition;
}
</style>
