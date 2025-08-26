import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Cadastro from '../views/Cadastro.vue'
import Painel from '../views/Painel.vue'
import Relatorio from '../views/Relatorio.vue'
import Aprovar from '../views/Aprovar.vue'
import Times from '../views/Times.vue'
import NovaPelada from '../views/NovaPelada.vue'
import Avisos from '../views/Avisos.vue'
import Estatisticas from '../views/RegistrarStats.vue'
import Ranking from '../views/Ranking.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/cadastro', component: Cadastro },
  { path: '/painel', component: Painel },
  { path: '/relatorio', name: 'Relatorio', component: Relatorio },
  { path: '/aprovar', name: 'Aprovar', component: Aprovar },
  { path: '/times', name: 'Times', component: Times },
  { path: '/nova-pelada', name: 'NovaPelada', component: NovaPelada },
  { path: '/avisos', name: 'Avisos', component: Avisos },
  { path: '/estatisticas', name: 'Avisos', component: Estatisticas },
  { path: '/ranking', name: 'Avisos', component: Ranking },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
