<template>
  <button @click="logout" class="btn btn-red absolute top-4 right-4">Sair</button>
  <div v-if="carregando" class="loader-overlay">
    <div class="loader"></div>
  </div>

  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-6">
    <div class="w-full max-w-2xl bg-white shadow-xl rounded-2xl p-8">
      <div v-if="avisos && avisos.length > 0" class="mb-4 bg-yellow-200 border-l-4 border-yellow-600 text-yellow-800 p-4 rounded">
        <p class="font-semibold">
          🔔 Você tem {{ avisos.length }} aviso{{ avisos.length > 1 ? 's' : '' }} pendente{{ avisos.length > 1 ? 's' : '' }}!
        </p>
        <router-link to="/avisos" class="underline text-blue-700 hover:text-blue-900 transition ml-2">
          Ver agora →
        </router-link>
      </div>

      <h1 class="text-3xl font-bold text-gray-800 mb-6">
        Bem-vindo, <span class="text-blue-600">{{ user?.nome }}</span>
      </h1>

      <div v-if="pelada" class="mb-8">
        <router-link
          to="/avisos"
          class="bg-yellow-400 text-white px-4 py-2 rounded hover:bg-yellow-500 transition-all block mt-2"
        >
          🔔 Ver Avisos
        </router-link>

        <h2 class="text-xl font-semibold text-gray-700 mb-2">📅 Próxima Pelada</h2>
        <p class="text-gray-600">
          {{ formatarData(pelada.data) }} às {{ pelada.horario }} — {{ pelada.local }}
        </p>

        <div class="mt-4">
          <div v-if="presente && !timesSorteados">
            <p class="text-green-600 font-medium">✅ Presença confirmada</p>
            <button @click="cancelarPresenca" class="btn btn-red mt-2">Cancelar presença</button>
          </div>

          <div v-else-if="podeConfirmar && !timesSorteados">
            <button
              @click="confirmarPresenca"
              class="btn btn-green"
              :disabled="lotado"
              :class="{'opacity-60 cursor-not-allowed': lotado}"
            >
              Confirmar presença
            </button>
            <p v-if="lotado" class="mt-2 text-red-600 font-medium">⚠️ Pelada cheia ({{ MAX_VAGAS }} vagas).</p>
          </div>

          <div v-else>
            <p class="text-red-500">⚠️ Você não pode confirmar presença</p>
          </div>
        </div>

        <br />

        <router-link
          to="/times"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-all block"
        >
          🏆 Ver Times Sorteados
        </router-link>

        <p class="mt-4 text-gray-700">
          👥 Jogadores confirmados: <span class="font-semibold">{{ totalConfirmados }}</span>
          <span v-if="!lotado"> • Vagas restantes: <span class="font-semibold">{{ MAX_VAGAS - totalConfirmados }}</span></span>
        </p>
      </div>

      <div v-if="user?.papel === 'admin'" class="border-t pt-6">
        <h3 class="text-lg font-semibold text-gray-700 mb-4">⚙️ Administração</h3>

        <button v-if="!timesSorteados" @click="sortearTimes" class="btn btn-blue mb-2">
          Sortear Times
        </button>

        <button v-if="timesSorteados" @click="cancelarSorteio" class="btn btn-red mb-4">
          Cancelar Sorteio
        </button>

        <button
          @click="abrirModalCancelar"
          class="btn btn-red mt-2 mb-2"
          v-if="user?.papel === 'admin' && pelada && !timesSorteados"
        >
          ❌ Cancelar Pelada
        </button>

        <router-link
          to="/nova-pelada"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-all block mb-2"
        >
          ➕ Nova Pelada
        </router-link>

        <router-link
          to="/relatorio"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-all block mb-2"
        >
          📊 Relatório de Pagamentos
        </router-link>

        <router-link
          to="/aprovar"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-all block"
        >
          💰 Aprovar Pagamento
        </router-link>
      </div>
    </div>
  </div>

  <!-- Modal cancelar pelada -->
  <div v-if="mostrarModalCancelar" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full">
      <h2 class="text-xl font-semibold mb-4">Cancelar Pelada</h2>
      <textarea v-model="motivoCancelamento" class="w-full p-2 border rounded mb-4" placeholder="Informe o motivo do cancelamento"></textarea>
      <div class="flex justify-end space-x-2">
        <button @click="mostrarModalCancelar = false" class="btn btn-blue">Fechar</button>
        <button @click="cancelarPelada" class="btn btn-red">Confirmar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { auth, db } from '../firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
  doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, deleteDoc,
  runTransaction, serverTimestamp
} from 'firebase/firestore'

const MAX_VAGAS = 20

const mostrarModalCancelar = ref(false)
const motivoCancelamento = ref('')
const abrirModalCancelar = () => { mostrarModalCancelar.value = true }

const user = ref(null)
const pelada = ref(null)
const presente = ref(false)
const podeConfirmar = ref(false)
const timesSorteados = ref(false)
const carregando = ref(false)
const avisos = ref([])
const totalConfirmados = ref(0)
const lotado = ref(false)

let peladaId = null

const logout = async () => {
  await signOut(auth)
  window.location.href = '/login'
}

onMounted(async () => {
  onAuthStateChanged(auth, async (u) => {
    if (!u) return (window.location.href = '/login')

    const snap = await getDoc(doc(db, 'usuarios', u.uid))
    user.value = { id: u.uid, ...snap.data() }

    // Carrega a (única) pelada aberta
    const peladasSnap = await getDocs(collection(db, 'peladas'))
    peladasSnap.forEach((p) => {
      pelada.value = p.data()
      peladaId = p.id
    })

    // Garante que o contador exista
    await inicializarContadorSeNecessario()

    // Lê contador de confirmados
    await atualizarTotais()

    // Avisos
    const avisosSnap = await getDocs(query(
      collection(db, 'avisos'),
      where('userId', '==', u.uid),
      where('lido', '==', false)
    ))
    avisos.value = []
    avisosSnap.forEach((docx) => avisos.value.push(docx.data()))

    // Times sorteados
    const timesSnap = await getDocs(query(collection(db, 'times'), where('peladaId', '==', peladaId)))
    timesSorteados.value = !timesSnap.empty

    // Pagamento do mês
    const mesAtual = new Date().toISOString().slice(0, 7)
    const pagamentoSnap = await getDocs(query(
      collection(db, 'pagamentos'),
      where('userId', '==', u.uid),
      where('mesAno', '==', mesAtual)
    ))
    const pagou = !pagamentoSnap.empty

    // Já confirmou?
    const presRefId = `${peladaId}_${u.uid}`
    const presRef = doc(db, 'presencas', presRefId)
    const presSnap = await getDoc(presRef)
    presente.value = presSnap.exists()

    podeConfirmar.value = pagou && !presente.value
  })
})

async function inicializarContadorSeNecessario() {
  if (!peladaId) return
  const peladaRef = doc(db, 'peladas', peladaId)
  const pSnap = await getDoc(peladaRef)
  if (!pSnap.exists()) return
  const data = pSnap.data() || {}
  if (typeof data.confirmadosCount !== 'number') {
    // Fallback inicial: conta presenças existentes e grava
    const presSnap = await getDocs(query(collection(db, 'presencas'), where('peladaId', '==', peladaId)))
    const count = presSnap.size
    await setDoc(peladaRef, { confirmadosCount: count }, { merge: true })
  }
}

async function atualizarTotais() {
  const peladaRef = doc(db, 'peladas', peladaId)
  const pSnap = await getDoc(peladaRef)
  const data = pSnap.data() || {}
  let count = data.confirmadosCount

  // Fallback caso não exista por algum motivo
  if (typeof count !== 'number') {
    const presSnap = await getDocs(query(collection(db, 'presencas'), where('peladaId', '==', peladaId)))
    count = presSnap.size
  }

  totalConfirmados.value = count
  lotado.value = count >= MAX_VAGAS
}

const confirmarPresenca = async () => {
  try {
    carregando.value = true

    await runTransaction(db, async (transaction) => {
      const peladaRef = doc(db, 'peladas', peladaId)
      const peladaSnapTx = await transaction.get(peladaRef)
      if (!peladaSnapTx.exists()) throw new Error('Pelada não encontrada.')

      const data = peladaSnapTx.data() || {}
      const current = typeof data.confirmadosCount === 'number' ? data.confirmadosCount : 0
      if (current >= MAX_VAGAS) throw new Error('FULL')

      // Impede duplicidade por usuário/pelada
      const presRefId = `${peladaId}_${user.value.id}`
      const presRef = doc(db, 'presencas', presRefId)
      const presSnapTx = await transaction.get(presRef)
      if (presSnapTx.exists()) throw new Error('ALREADY')

      transaction.set(presRef, {
        id: presRefId,
        userId: user.value.id,
        peladaId,
        confirmado: true,
        dataConfirmacao: serverTimestamp()
      })

      transaction.update(peladaRef, { confirmadosCount: current + 1 })
    })

    presente.value = true
    await atualizarTotais()
  } catch (err) {
    if (err.message === 'FULL') {
      alert(`⚠️ Pelada cheia! Limite de ${MAX_VAGAS} jogadores atingido.`)
    } else if (err.message === 'ALREADY') {
      alert('Você já está confirmado nesta pelada.')
      presente.value = true
    } else {
      console.error('Erro ao confirmar presença:', err)
      alert('Erro ao confirmar presença.')
    }
  } finally {
    carregando.value = false
  }
}

const cancelarPresenca = async () => {
  try {
    carregando.value = true

    await runTransaction(db, async (transaction) => {
      const peladaRef = doc(db, 'peladas', peladaId)
      const peladaSnapTx = await transaction.get(peladaRef)
      if (!peladaSnapTx.exists()) throw new Error('Pelada não encontrada.')

      const data = peladaSnapTx.data() || {}
      const current = typeof data.confirmadosCount === 'number' ? data.confirmadosCount : 0

      const presRefId = `${peladaId}_${user.value.id}`
      const presRef = doc(db, 'presencas', presRefId)
      const presSnapTx = await transaction.get(presRef)
      if (!presSnapTx.exists()) {
        // Nada para cancelar, só garante estado
        return
      }

      transaction.delete(presRef)
      transaction.update(peladaRef, { confirmadosCount: Math.max(0, current - 1) })
    })

    presente.value = false
    await atualizarTotais()
  } catch (err) {
    console.error('Erro ao cancelar presença:', err)
    alert('Erro ao cancelar presença.')
  } finally {
    carregando.value = false
  }
}

const sortearTimes = async () => {
  try {
    carregando.value = true;

    const q = query(collection(db, 'presencas'), where('peladaId', '==', peladaId));
    const snap = await getDocs(q);

    const jogadoresConfirmados = [];
    for (const docSnap of snap.docs) {
      const userRef = await getDoc(doc(db, 'usuarios', docSnap.data().userId));
      if (userRef.exists()) {
        jogadoresConfirmados.push({
          id: userRef.id,
          nome: userRef.data().nome,
          goleiro: userRef.data().goleiro
        });
      }
    }

    if (jogadoresConfirmados.length < 10) {
      alert('É necessário pelo menos 10 jogadores confirmados para sortear os times.');
      carregando.value = false;
      return;
    }

    const goleiros = jogadoresConfirmados.filter(j => j.goleiro);
    const linha = jogadoresConfirmados.filter(j => !j.goleiro);
    const jogadoresEmbaralhados = [...goleiros, ...linha].sort(() => Math.random() - 0.5);

    const jogadoresJaSorteados = new Set();
    const timesMontados = [];
    const numJogadoresPorTime = 5;
    let numeroTime = 1;

    while (jogadoresJaSorteados.size < jogadoresEmbaralhados.length) {
      const timeAtual = [];

      for (let i = 0; i < jogadoresEmbaralhados.length && timeAtual.length < numJogadoresPorTime; i++) {
        const jogador = jogadoresEmbaralhados[i];

        if (jogadoresJaSorteados.has(jogador.id)) continue;

        const jaTemGoleiro = timeAtual.some(j => j.goleiro);
        if (jogador.goleiro && jaTemGoleiro) continue;

        timeAtual.push(jogador);
        jogadoresJaSorteados.add(jogador.id);
      }

      if (timeAtual.length > 0) {
        timesMontados.push({
          numero: numeroTime++,
          jogadores: [...timeAtual]
        });
      } else {
        break;
      }
    }

    await addDoc(collection(db, 'times'), {
      peladaId,
      criadoEm: new Date(),
      times: timesMontados.map(t => ({
        numero: t.numero,
        jogadores: t.jogadores.map(j => j.id)
      }))
    });

    alert('Times sorteados com sucesso!');
    window.location.href = '/times';
  } catch (err) {
    console.error('Erro ao sortear times:', err);
    alert('Erro ao sortear times.');
  } finally {
    carregando.value = false;
  }
}

const cancelarSorteio = async () => {
  try {
    const q = query(collection(db, 'times'), where('peladaId', '==', peladaId))
    const snap = await getDocs(q)
    carregando.value = true

    for (const docSnap of snap.docs) {
      await deleteDoc(docSnap.ref)
    }

    alert('Sorteio cancelado com sucesso!')
    timesSorteados.value = false
  } catch (err) {
    carregando.value = false
    console.error('Erro ao cancelar sorteio:', err)
    alert('Erro ao cancelar sorteio.')
  } finally {
    carregando.value = false
  }
}

const cancelarPelada = async () => {
  if (!motivoCancelamento.value.trim()) {
    alert('Informe o motivo do cancelamento.')
    return
  }

  await deleteDoc(doc(db, 'peladas', peladaId))

  const presencasSnap = await getDocs(
    query(collection(db, 'presencas'), where('peladaId', '==', peladaId))
  )

  for (const docSnap of presencasSnap.docs) {
    const userId = docSnap.data().userId
    await addDoc(collection(db, 'avisos'), {
      userId,
      mensagem: `A pelada foi cancelada. Motivo: ${motivoCancelamento.value}`,
      lido: false,
      criadoEm: new Date()
    })
  }

  alert('Pelada cancelada com sucesso!')
  window.location.reload()
}

function formatarData(dataFirestore) {
  const data = dataFirestore.toDate()
  return data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short'
  })
}
</script>

<style scoped>
.btn { @apply px-4 py-2 rounded-lg font-semibold transition-colors; }
.btn-green { @apply bg-green-500 text-white hover:bg-green-600; }
.btn-red { @apply bg-red-500 text-white hover:bg-red-600; }
.btn-blue { @apply bg-blue-500 text-white hover:bg-blue-600; }

.loader-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(255, 255, 255, 0.7); z-index: 9999;
  display: flex; align-items: center; justify-content: center;
}
.loader {
  border: 8px solid #f3f3f3;
  border-top: 8px solid #3b82f6; border-radius: 50%;
  width: 60px; height: 60px; animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
