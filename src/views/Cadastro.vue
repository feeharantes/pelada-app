<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 p-6">
    <div class="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
      <h2 class="text-2xl font-bold mb-6 text-center">Cadastro de Jogador</h2>

      <form @submit.prevent="cadastrar">
        <!-- Nome -->
        <div class="mb-4">
          <label class="block mb-1 font-medium">Nome</label>
          <input v-model="nome" required class="input" type="text" placeholder="Seu nome completo" />
        </div>

        <!-- Email -->
        <div class="mb-4">
          <label class="block mb-1 font-medium">Email</label>
          <input v-model="email" required class="input" type="email" placeholder="email@exemplo.com" />
        </div>

        <!-- WhatsApp com máscara -->
        <div class="mb-4">
          <label class="block mb-1 font-medium">WhatsApp</label>
          <input
            v-model="whatsapp"
            required
            class="input"
            type="tel"
            placeholder="(99) 99999-9999"
            @input="formatarWhatsApp"
          />
        </div>

        <!-- Senha -->
        <div class="mb-4">
          <label class="block mb-1 font-medium">Senha</label>
          <input
            v-model="senha"
            required
            class="input"
            type="password"
            minlength="6"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <!-- Checkbox goleiro -->
        <div class="mb-4 flex items-center gap-2">
          <input v-model="goleiro" type="checkbox" />
          <label class="font-medium">Sou goleiro</label>
        </div>

        <!-- Botão -->
        <button type="submit" class="btn btn-blue w-full">Cadastrar</button>

        <!-- Erro -->
        <p v-if="erro" class="text-red-600 mt-4 text-sm text-center">{{ erro }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { auth, db } from '../firebase'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const nome = ref('')
const email = ref('')
const senha = ref('')
const whatsapp = ref('')
const goleiro = ref(false)
const erro = ref('')

const formatarWhatsApp = () => {
  let num = whatsapp.value.replace(/\D/g, '').slice(0, 11)

  if (num.length >= 2) num = `(${num.slice(0, 2)}) ${num.slice(2)}`
  if (num.length >= 10) num = `${num.slice(0, 10)}-${num.slice(10)}`
  whatsapp.value = num
}

const cadastrar = async () => {
  erro.value = ''

  if (senha.value.length < 6) {
    erro.value = 'A senha precisa ter no mínimo 6 caracteres.'
    return
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email.value, senha.value)

    await setDoc(doc(db, 'usuarios', cred.user.uid), {
      nome: nome.value.trim(),
      email: email.value.trim(),
      whatsapp: whatsapp.value.trim(),
      goleiro: goleiro.value,
      papel: 'jogador',
      criadoEm: serverTimestamp()
    })

    window.location.href = '/painel'
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      erro.value = 'Este e-mail já está cadastrado.'
    } else if (e.code === 'auth/invalid-email') {
      erro.value = 'E-mail inválido.'
    } else {
      erro.value = 'Erro ao cadastrar. Tente novamente.'
    }
  }
}
</script>

<style scoped>
.input {
  @apply w-full px-4 py-2 border rounded-lg outline-none;
}
.btn {
  @apply px-4 py-2 rounded-lg font-semibold transition-colors;
}
.btn-blue {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}
</style>
