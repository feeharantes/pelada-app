<template>
  <div class="max-w-3xl mx-auto mt-10 bg-white p-6 rounded shadow">
    <h1 class="text-2xl font-bold mb-6 text-center">🏆 Rankings</h1>

    <div class="grid md:grid-cols-2 gap-6">
      <div>
        <h2 class="text-xl font-semibold mb-2">📅 Mensal - {{ mesAtual }}</h2>
        <ul>
          <li v-for="j in rankingMensal" :key="j.nome" class="mb-2">
            {{ j.nome }} - {{ j.gols }} gols / {{ j.assistencias }} assistências
          </li>
        </ul>
      </div>

      <div>
        <h2 class="text-xl font-semibold mb-2">📆 Anual - {{ anoAtual }}</h2>
        <ul>
          <li v-for="j in rankingAnual" :key="j.nome" class="mb-2">
            {{ j.nome }} - {{ j.gols }} gols / {{ j.assistencias }} assistências
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { db } from '../firebase'
import { getDocs, collection, doc, getDoc } from 'firebase/firestore'
import { onMounted, ref } from 'vue'

const rankingMensal = ref([])
const rankingAnual = ref([])
const mesAtual = new Date().toISOString().slice(0, 7)
const anoAtual = new Date().getFullYear().toString()

const agruparPorJogador = async (estatisticas) => {
  const mapa = {}
  for (const est of estatisticas) {
    const userSnap = await getDoc(doc(db, 'usuarios', est.userId))
    const nome = userSnap.data().nome
    if (!mapa[nome]) {
      mapa[nome] = { gols: 0, assistencias: 0 }
    }
    mapa[nome].gols += est.gols
    mapa[nome].assistencias += est.assistencias
  }

  return Object.entries(mapa).map(([nome, stats]) => ({
    nome,
    gols: stats.gols,
    assistencias: stats.assistencias
  })).sort((a, b) => b.gols - a.gols)
}

onMounted(async () => {
  const snap = await getDocs(collection(db, 'estatisticas'))
  const todos = snap.docs.map(d => ({ ...d.data(), registradoEm: d.data().registradoEm.toDate() }))

  const mes = todos.filter(e => e.registradoEm.toISOString().slice(0, 7) === mesAtual)
  const ano = todos.filter(e => e.registradoEm.getFullYear().toString() === anoAtual)

  rankingMensal.value = await agruparPorJogador(mes)
  rankingAnual.value = await agruparPorJogador(ano)
})
</script>
