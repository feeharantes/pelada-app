<template>
  <div class="max-w-5xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg">
    <h1 class="text-3xl font-bold text-center text-gray-800 mb-6">💰 Aprovar Pagamentos</h1>

    <router-link
      to="/painel"
      class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition mb-6"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Voltar para o painel
    </router-link>

    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-4">
      <div>
        <label class="font-semibold">Selecione o mês:</label>
        <select v-model="mesSelecionado" @change="carregarPagamentos" class="ml-2 border rounded px-2 py-1">
          <option v-for="mes in meses" :key="mes" :value="mes">{{ mes }}</option>
        </select>
      </div>

      <div>
        <label class="font-semibold">Filtrar por nome:</label>
        <input
          v-model="filtroNome"
          placeholder="Digite um nome..."
          class="ml-2 border rounded px-2 py-1"
        />
      </div>
    </div>

    <div v-if="carregando">Carregando pagamentos...</div>

    <table v-else class="w-full mt-4 table-auto border-collapse">
      <thead>
        <tr class="bg-gray-100 text-left">
          <th class="p-2 border">Jogador</th>
          <th class="p-2 border">Goleiro</th>
          <th class="p-2 border">Status</th>
          <th class="p-2 border">Confirmou em</th>
          <th class="p-2 border">Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="jogador in jogadoresFiltrados" :key="jogador.id" class="border-t">
          <td class="p-2 border">{{ jogador.nome }}</td>
          <td class="p-2 border">{{ jogador.goleiro ? 'Sim' : 'Não' }}</td>
          <td class="p-2 border">
            <span :class="jogador.pagou ? 'text-green-600' : 'text-red-600'">
              {{ jogador.pagou ? 'Pago' : 'Não Pago' }}
            </span>
          </td>
          <td class="p-2 border text-sm text-gray-700">
            <span v-if="jogador.presencaConfirmada">
              {{ formatarDataHora(jogador.presencaData) }}
            </span>
            <span v-else class="text-gray-400">—</span>
          </td>
          <td class="p-2 border">
            <div class="flex flex-wrap gap-2">
              <button
                v-if="!jogador.pagou"
                @click="marcarComoPago(jogador.id)"
                class="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                Pago
              </button>
              <button
                v-else
                @click="removerPagamento(jogador.id)"
                class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
              >
                Não Pago
              </button>

              <button
                v-if="jogador.pagou && peladaAbertaId && !jogador.presencaConfirmada"
                @click="confirmarPresenca(jogador.id)"
                class="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                Confirmar
              </button>

              <button
                v-if="jogador.pagou && peladaAbertaId && jogador.presencaConfirmada"
                @click="cancelarPresenca(jogador.id)"
                class="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
              >
                Cancelar
              </button>

              <button
                @click="excluirJogador(jogador.id)"
                class="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-800"
              >
                Excluir
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { auth, db } from '../firebase'
import {
  collection, getDocs, doc, getDoc, addDoc, deleteDoc, query, where,
  runTransaction, setDoc, serverTimestamp
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

const MAX_VAGAS = 20

const jogadores = ref([]) // {id, nome, goleiro, pagou, presencaConfirmada, presencaData?}
const carregando = ref(true)
const mesSelecionado = ref('')
const peladaAbertaId = ref(null)
const filtroNome = ref('')
const meses = gerarUltimosMeses()

function gerarUltimosMeses() {
  const lista = []
  const hoje = new Date()
  for (let i = 0; i < 12; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const mes = data.toISOString().slice(0, 7)
    lista.push(mes)
  }
  return lista
}

const jogadoresFiltrados = computed(() => {
  return jogadores.value
    .filter(j => j.nome.toLowerCase().includes(filtroNome.value.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome))
})

onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    if (!u) return (window.location.href = '/login')
    const snap = await getDoc(doc(db, 'usuarios', u.uid))
    if (!snap.exists() || snap.data().papel !== 'admin') {
      alert('Acesso negado.')
      return (window.location.href = '/painel')
    }
    mesSelecionado.value = meses[0]

    // Descobre a pelada aberta (assumindo 1)
    const peladasSnap = await getDocs(collection(db, 'peladas'))
    if (!peladasSnap.empty) {
      peladasSnap.forEach(p => peladaAbertaId.value = p.id)
    }

    // Garante contador antes de operar
    if (peladaAbertaId.value) {
      await inicializarContadorSeNecessario()
    }

    await carregarPagamentos()
  })
})

const inicializarContadorSeNecessario = async () => {
  const peladaRef = doc(db, 'peladas', peladaAbertaId.value)
  const pSnap = await getDoc(peladaRef)
  if (!pSnap.exists()) return

  const data = pSnap.data() || {}
  if (typeof data.confirmadosCount !== 'number') {
    const presSnap = await getDocs(query(
      collection(db, 'presencas'),
      where('peladaId', '==', peladaAbertaId.value)
    ))
    await setDoc(peladaRef, { confirmadosCount: presSnap.size }, { merge: true })
  }
}

const carregarPagamentos = async () => {
  carregando.value = true
  jogadores.value = []

  // usuários
  const usuariosSnap = await getDocs(collection(db, 'usuarios'))

  // pagamentos do mês selecionado
  const pagamentosSnap = await getDocs(
    query(collection(db, 'pagamentos'), where('mesAno', '==', mesSelecionado.value))
  )
  const pagosIDs = pagamentosSnap.docs.map(d => d.data().userId)

  for (const docSnap of usuariosSnap.docs) {
    const dados = docSnap.data()
    let criadoEm = new Date(0)
    if (dados.criadoEm && typeof dados.criadoEm.toDate === 'function') {
      criadoEm = dados.criadoEm.toDate()
    }

    const criadoEmMesAno = criadoEm.toISOString().slice(0, 7)
    if (criadoEmMesAno <= mesSelecionado.value) {
      let presencaConfirmada = false
      let presencaData = null

      if (peladaAbertaId.value) {
        // ID determinístico de presença
        const presRefId = `${peladaAbertaId.value}_${docSnap.id}`
        const pSnap = await getDoc(doc(db, 'presencas', presRefId))
        presencaConfirmada = pSnap.exists()
        if (presencaConfirmada) {
          const d = pSnap.data()
          presencaData = d?.dataConfirmacao || null
        }
      }

      jogadores.value.push({
        id: docSnap.id,
        nome: dados.nome,
        goleiro: !!dados.goleiro,
        pagou: pagosIDs.includes(docSnap.id),
        presencaConfirmada,
        presencaData
      })
    }
  }

  carregando.value = false
}

const marcarComoPago = async (userId) => {
  await addDoc(collection(db, 'pagamentos'), {
    userId,
    mesAno: mesSelecionado.value,
    dataPagamento: new Date()
  })
  await carregarPagamentos()
}

const removerPagamento = async (userId) => {
  const snap = await getDocs(query(
    collection(db, 'pagamentos'),
    where('userId', '==', userId),
    where('mesAno', '==', mesSelecionado.value)
  ))
  for (const docRef of snap.docs) {
    await deleteDoc(doc(db, 'pagamentos', docRef.id))
  }
  await carregarPagamentos()
}

const confirmarPresenca = async (userId) => {
  if (!peladaAbertaId.value) return
  try {
    await runTransaction(db, async (transaction) => {
      const peladaRef = doc(db, 'peladas', peladaAbertaId.value)
      const peladaSnapTx = await transaction.get(peladaRef)
      if (!peladaSnapTx.exists()) throw new Error('Pelada não encontrada.')

      const data = peladaSnapTx.data() || {}
      const current = typeof data.confirmadosCount === 'number' ? data.confirmadosCount : 0
      if (current >= MAX_VAGAS) throw new Error('FULL')

      const presRefId = `${peladaAbertaId.value}_${userId}`
      const presRef = doc(db, 'presencas', presRefId)
      const presSnapTx = await transaction.get(presRef)
      if (presSnapTx.exists()) throw new Error('ALREADY')

      transaction.set(presRef, {
        id: presRefId,
        userId,
        peladaId: peladaAbertaId.value,
        confirmado: true,
        dataConfirmacao: serverTimestamp()
      })
      transaction.update(peladaRef, { confirmadosCount: current + 1 })
    })

    alert('Presença confirmada!')
    await carregarPagamentos()
  } catch (err) {
    if (err.message === 'FULL') {
      alert(`⚠️ Pelada cheia! Limite de ${MAX_VAGAS} jogadores atingido.`)
    } else if (err.message === 'ALREADY') {
      alert('Este jogador já está confirmado nesta pelada.')
    } else {
      console.error('Erro ao confirmar presença:', err)
      alert('Erro ao confirmar presença.')
    }
  }
}

const cancelarPresenca = async (userId) => {
  if (!peladaAbertaId.value) return
  try {
    await runTransaction(db, async (transaction) => {
      const peladaRef = doc(db, 'peladas', peladaAbertaId.value)
      const peladaSnapTx = await transaction.get(peladaRef)
      if (!peladaSnapTx.exists()) throw new Error('Pelada não encontrada.')

      const data = peladaSnapTx.data() || {}
      const current = typeof data.confirmadosCount === 'number' ? data.confirmadosCount : 0

      const presRefId = `${peladaAbertaId.value}_${userId}`
      const presRef = doc(db, 'presencas', presRefId)
      const presSnapTx = await transaction.get(presRef)
      if (!presSnapTx.exists()) return // nada para cancelar

      transaction.delete(presRef)
      transaction.update(peladaRef, { confirmadosCount: Math.max(0, current - 1) })
    })

    alert('Presença cancelada!')
    await carregarPagamentos()
  } catch (err) {
    console.error('Erro ao cancelar presença:', err)
    alert('Erro ao cancelar presença.')
  }
}

const excluirJogador = async (userId) => {
  const confirmar = confirm('Tem certeza que deseja excluir este jogador? Isso apagará os pagamentos e presenças dele também.')
  if (!confirmar) return

  try {
    // Deletar pagamentos
    const pagamentosSnap = await getDocs(query(collection(db, 'pagamentos'), where('userId', '==', userId)))
    for (const docRef of pagamentosSnap.docs) {
      await deleteDoc(doc(db, 'pagamentos', docRef.id))
    }

    // Deletar presenças
    const presencasSnap = await getDocs(query(collection(db, 'presencas'), where('userId', '==', userId)))
    for (const docRef of presencasSnap.docs) {
      await deleteDoc(doc(db, 'presencas', docRef.id))
    }

    // Deletar usuário
    await deleteDoc(doc(db, 'usuarios', userId))

    alert('Jogador excluído com sucesso.')
    await carregarPagamentos()
  } catch (e) {
    console.error('Erro ao excluir jogador:', e)
    alert('Erro ao excluir o jogador.')
  }
}

// util
function formatarDataHora(ts) {
  if (!ts) return '—'
  try {
    const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '—'
  }
}
</script>
