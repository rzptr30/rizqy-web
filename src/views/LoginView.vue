<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../stores/auth'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await login(email.value.trim(), password.value)
    router.push({ name: 'home' })
  } catch (e) {
    error.value = 'Login gagal: email atau password salah.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="card">
    <h1>Rizqy Barokah Fried Chicken</h1>
    <p class="muted">Masuk untuk melanjutkan</p>
    <form @submit.prevent="submit">
      <label>Email
        <input v-model="email" type="email" autocomplete="username" required />
      </label>
      <label>Password
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <button :disabled="loading">{{ loading ? 'Memproses...' : 'Masuk' }}</button>
    </form>
  </main>
</template>