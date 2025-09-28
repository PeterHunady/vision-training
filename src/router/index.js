import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '@/views/LandingPage.vue'
import SettingsPage from '@/views/SettingsPage.vue'
import TrainingPage from '@/views/TrainingPage.vue'
import StatisticsPage from '@/views/StatisticsPage.vue'

const routes = [
  { path: '/', component: LandingPage },
  { path: '/settings', component: SettingsPage },
  { path: '/training', component: TrainingPage },
  { path: '/statistics', component: StatisticsPage },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
