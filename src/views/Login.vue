<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white shadow-xl rounded-xl p-8 w-full max-w-md">
      <h1 class="text-2xl font-bold mb-6 text-center text-gray-800">Entrar no Pelada ⚽</h1>

      <form @submit.prevent="login">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1 text-gray-700">Email</label>
          <input v-model="email" type="email" class="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400" required />
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium mb-1 text-gray-700">Senha</label>
          <input v-model="senha" type="password" class="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400" required />
        </div>

        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">Entrar</button>
      </form>

      <p class="text-sm mt-4 text-center text-gray-600">
        Não tem conta? <a href="/cadastro" class="text-blue-600 hover:underline">Cadastre-se</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { auth } from '../firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'vue-router'

const email = ref('')
const senha = ref('')
const router = useRouter()

const login = async () => {
  try {
    await signInWithEmailAndPassword(auth, email.value, senha.value)
    router.push('/painel')
  } catch (e) {
    alert('Erro ao entrar. Verifique o email e senha.')
    console.error(e)
  }
}
</script>
