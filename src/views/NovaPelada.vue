<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-6 relative">
    <!-- Overlay de loading -->
    <div
      v-if="carregando"
      class="absolute inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center"
    >
      <div class="flex flex-col items-center">
        <svg class="w-10 h-10 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 000 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
          ></path>
        </svg>
        <p class="text-white mt-2 font-medium">Cadastrando...</p>
      </div>
    </div>

    <div class="w-full max-w-xl bg-white shadow-xl rounded-2xl p-8 z-10">
      <h1 class="text-2xl font-bold text-gray-800 mb-6">⚽ Cadastrar Nova Pelada</h1>

      <div v-if="peladaAberta" class="text-red-600 font-semibold mb-4">
        ❌ Já existe uma pelada em aberto. Aguarde encerrar para cadastrar uma nova.
      </div>

      <form @submit.prevent="cadastrarPelada" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">Data</label>
          <input v-model="data" type="date" class="input" :disabled="peladaAberta" required />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Horário</label>
          <input v-model="horario" type="time" class="input" :disabled="peladaAberta" required />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Local</label>
          <input v-model="local" type="text" class="input" :disabled="peladaAberta" required />
        </div>

        <button
          type="submit"
          class="btn btn-green w-full"
          :disabled="peladaAberta"
        >
          Cadastrar Pelada
        </button>

        <p v-if="erro" class="text-red-600 mt-2 font-medium">{{ erro }}</p>
        <p v-if="sucesso" class="text-green-600 mt-2 font-medium">{{ sucesso }}</p>
      </form>

      <router-link
        to="/painel"
        class="mt-6 inline-block text-blue-600 hover:underline text-sm"
      >
        🔙 Voltar ao Painel
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db } from '../firebase'
import { collection, getDocs, addDoc } from 'firebase/firestore'

const data = ref('')
const horario = ref('')
const local = ref('')
const erro = ref('')
const sucesso = ref('')
const peladaAberta = ref(false)
const carregando = ref(false)

onMounted(async () => {
  const peladasSnap = await getDocs(collection(db, 'peladas'))
  const agora = new Date()

  for (const doc of peladasSnap.docs) {
    const pelada = doc.data()
    const dataPelada = pelada.data.toDate()

    // Ajusta horário da pelada
    const [h, m] = pelada.horario.split(':').map(Number)
    dataPelada.setHours(h)
    dataPelada.setMinutes(m)
    dataPelada.setSeconds(0)

    const fim = new Date(dataPelada.getTime() + 2 * 60 * 60 * 1000)
    console.log(agora)
        console.log(fim)
    if (agora < fim) {
      peladaAberta.value = true
      break
    }
  }
})


const cadastrarPelada = async () => {
  erro.value = ''
  sucesso.value = ''

  if (peladaAberta.value) return

  try {
    carregando.value = true

    const dataObj = new Date(`${data.value}T${horario.value}`)

    await addDoc(collection(db, 'peladas'), {
      data: dataObj,
      horario: horario.value,
      local: local.value
    })

    sucesso.value = 'Pelada cadastrada com sucesso!'
    data.value = ''
    horario.value = ''
    local.value = ''
  } catch (err) {
    console.error(err)
    erro.value = 'Erro ao cadastrar a pelada.'
  } finally {
    carregando.value = false
  }
}
</script>

<style scoped>
.input {
  @apply w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500;
}
.btn {
  @apply px-4 py-2 rounded-lg font-semibold transition-colors;
}
.btn-green {
  @apply bg-green-500 text-white hover:bg-green-600;
}
</style>
