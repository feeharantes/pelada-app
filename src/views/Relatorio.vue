<template>
  <div class="bg-white shadow-lg rounded-xl p-6 max-w-4xl mx-auto mt-10">
    <router-link
      to="/painel"
      class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition mb-6"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24"
        stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Voltar para o painel
    </router-link>

    <h1 class="text-3xl font-bold text-gray-800 mb-6 text-center">
      📊 Relatório de Pagamentos
    </h1>

    <div class="mb-6">
      <label class="block mb-2 font-medium text-gray-700">Mês</label>
      <select v-model="mesSelecionado" @change="carregarPagamentos"
        class="w-full border border-gray-300 rounded px-4 py-2 focus:ring focus:ring-blue-300">
        <option v-for="mes in mesesDisponiveis" :key="mes" :value="mes">{{ mes }}</option>
      </select>
    </div>

    <div v-if="carregando">Carregando dados...</div>

    <div v-else>
      <canvas ref="canvasRef" class="my-6 mx-auto max-w-sm"></canvas>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div class="bg-green-100 p-4 rounded-lg shadow">
          <h2 class="text-lg font-semibold text-green-800 mb-2">✅ Pagaram</h2>
          <ul class="list-disc list-inside text-green-700">
            <li v-for="j in pagaram" :key="j">{{ j }}</li>
          </ul>
        </div>

        <div class="bg-red-100 p-4 rounded-lg shadow">
          <h2 class="text-lg font-semibold text-red-800 mb-2">❌ Faltam pagar</h2>
          <ul class="list-disc list-inside text-red-700">
            <li v-for="j in faltam" :key="j">{{ j }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watchEffect, watch } from 'vue'
import { auth, db } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  collection, getDocs, query, where, doc, getDoc
} from 'firebase/firestore'
import Chart from 'chart.js/auto'

const user = ref(null)
const pagaram = ref([])
const faltam = ref([])
const carregando = ref(true)

const canvasRef = ref(null)
let grafico = null

const mesesDisponiveis = ref([
  new Date().toISOString().slice(0, 7),
  ...Array.from({ length: 6 }).map((_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (i + 1))
    return d.toISOString().slice(0, 7)
  })
])
const mesSelecionado = ref(mesesDisponiveis.value[0])

onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    if (!u) return (window.location.href = '/login')

    const snap = await getDoc(doc(db, 'usuarios', u.uid))
    const usuarioLogado = snap.data()

    if (!usuarioLogado || usuarioLogado.papel !== 'admin') {
      alert('Acesso negado.')
      return (window.location.href = '/painel')
    }

    user.value = usuarioLogado
    await carregarPagamentos()
  })
})

const carregarPagamentos = async () => {
  carregando.value = true
  pagaram.value = []
  faltam.value = []

  const usuariosSnap = await getDocs(collection(db, 'usuarios'))
  const pagamentosSnap = await getDocs(
    query(collection(db, 'pagamentos'), where('mesAno', '==', mesSelecionado.value))
  )

  const idsPagaram = pagamentosSnap.docs.map(doc => doc.data().userId)

  const nomesPagaram = new Set()
  const nomesFaltam = new Set()

  usuariosSnap.forEach(u => {
    const dados = u.data()
    if (dados.papel === 'jogador') {
      const nome = dados.nome?.trim() || 'Sem Nome'
      if (idsPagaram.includes(u.id)) {
        nomesPagaram.add(nome)
      } else {
        nomesFaltam.add(nome)
      }
    }
  })

  pagaram.value = Array.from(nomesPagaram)
  faltam.value = Array.from(nomesFaltam)

  carregando.value = false
}

const desenharGrafico = () => {
  if (!canvasRef.value) return
  if (grafico) grafico.destroy()

  grafico = new Chart(canvasRef.value, {
    type: 'doughnut',
    data: {
      labels: ['Pagaram', 'Faltam'],
      datasets: [{
        data: [pagaram.value.length, faltam.value.length],
        backgroundColor: ['#16a34a', '#dc2626']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  })
}

// 🚨 Aqui está o segredo: renderizar o gráfico quando canvas + dados estiverem prontos
watchEffect(() => {
  if (
    canvasRef.value &&
    pagaram.value.length + faltam.value.length > 0 &&
    !carregando.value
  ) {
    desenharGrafico()
  }
})

watch(mesSelecionado, () => carregarPagamentos())
</script>

