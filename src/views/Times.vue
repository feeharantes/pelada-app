<template>
  <div class="p-6 text-center">
    <h1 class="text-3xl font-bold mb-6 text-gray-800">🏆 Times Sorteados</h1>

    <div v-if="acessoNegado" class="text-red-600 font-semibold">
      ❌ Você não foi sorteado para a próxima pelada.
    </div>

    <div v-else>
      <div
        v-for="time in times"
        :key="time.numero"
        class="mb-10 border rounded-lg bg-green-100 shadow-md overflow-hidden"
      >
        <h2 class="text-xl font-semibold py-3 bg-green-700 text-white">Time {{ time.numero }}</h2>

        <!-- Campo estilizado -->
        <div class="campo">
          <div class="linha">
            <div
              v-if="time.jogadores[0]"
              :class="['jogador', time.jogadores[0].id === user?.id ? 'jogador-destaque' : '']"
            >
              <span>{{ time.jogadores[0].id === user?.id ? '⭐' : '👕' }}</span>
              {{ time.jogadores[0].nome }}
            </div>
          </div>
          <div class="linha">
            <div
              v-if="time.jogadores[1]"
              :class="['jogador', time.jogadores[1].id === user?.id ? 'jogador-destaque' : '']"
            >
              <span>{{ time.jogadores[1].id === user?.id ? '⭐' : '👕' }}</span>
              {{ time.jogadores[1].nome }}
            </div>
            <div
              v-if="time.jogadores[2]"
              :class="['jogador', time.jogadores[2].id === user?.id ? 'jogador-destaque' : '']"
            >
              <span>{{ time.jogadores[2].id === user?.id ? '⭐' : '👕' }}</span>
              {{ time.jogadores[2].nome }}
            </div>
          </div>
          <div class="linha">
            <div
              v-if="time.jogadores[3]"
              :class="['jogador', time.jogadores[3].id === user?.id ? 'jogador-destaque' : '']"
            >
              <span>{{ time.jogadores[3].id === user?.id ? '⭐' : '👕' }}</span>
              {{ time.jogadores[3].nome }}
            </div>
          </div>
          <div class="linha">
            <div
              v-if="time.jogadores[4]"
              :class="['jogador', time.jogadores[4].id === user?.id ? 'jogador-destaque' : '']"
            >
              <span>{{ time.jogadores[4].id === user?.id ? '⭐' : '👕' }}</span>
              {{ time.jogadores[4].nome }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <router-link
      to="/painel"
      class="mt-6 inline-block bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition-all"
    >
      🔙 Voltar para o Painel
    </router-link>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { auth, db } from '../firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'

const user = ref(null)
const peladaId = ref(null)
const times = ref([])
const acessoNegado = ref(false)
const carregando = ref(false)

onMounted(() => {
  onAuthStateChanged(auth, async (u) => {
    if (!u) return (window.location.href = '/login')
    user.value = { id: u.uid }
    carregando.value = true
    const peladasSnap = await getDocs(collection(db, 'peladas'))
    peladasSnap.forEach((p) => {
      peladaId.value = p.id
    })

    const q = query(collection(db, 'times'), where('peladaId', '==', peladaId.value))
    const snap = await getDocs(q)

    if (!snap.empty) {
      const data = snap.docs[0].data()
      const resultado = []

      let foiSorteado = false

      for (const time of data.times) {
        const jogadoresDetalhados = []
        for (const id of time.jogadores) {
          const userRef = await getDoc(doc(db, 'usuarios', id))
          const jogador = { id, nome: userRef.data().nome }
          jogadoresDetalhados.push(jogador)

          if (id === user.value.id) foiSorteado = true
        }
        resultado.push({ numero: time.numero, jogadores: jogadoresDetalhados })
      }

      if (!foiSorteado) {
        acessoNegado.value = true
        carregando.value = false
      } else {
        times.value = resultado
        carregando.value = false
      }
    } else {
      acessoNegado.value = true
      carregando.value = false
    }
  })
})
</script>

<style scoped>
.campo {
  background: linear-gradient(to bottom, #4caf50, #388e3c);
  padding: 2rem;
  border-radius: 1rem;
  border: 3px solid #2e7d32;
  margin-top: 1rem;
}
.linha {
  display: flex;
  justify-content: center;
  margin: 0.5rem 0;
}
.jogador,
.goleiro {
  background-color: white;
  padding: 0.5rem 1.2rem;
  margin: 0 0.5rem;
  border-radius: 9999px;
  font-weight: bold;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.goleiro {
  background-color: #ffcc00;
  color: #000;
}
.jogador-destaque {
  border: 2px solid #0d47a1;
  background-color: #e3f2fd;
  color: #0d47a1;
  font-weight: 800;
  box-shadow: 0 0 10px rgba(13, 71, 161, 0.5);
}
.loader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.7);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loader {
  border: 8px solid #f3f3f3;
  border-top: 8px solid #3b82f6; /* azul */
  border-radius: 50%;
  width: 60px;
  height: 60px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

</style>
