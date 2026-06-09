<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import { useTheme, useDisplay } from 'vuetify'

const theme = useTheme()
const { mobile } = useDisplay()

const drawer = ref(!mobile.value)

const navItems = [
  { title: 'Dashboard', to: '/', icon: 'mdi-view-dashboard-outline' },
  { title: 'About', to: '/about', icon: 'mdi-information-outline' },
]

const isDark = ref(true)
function toggleTheme() {
  isDark.value = !isDark.value
  theme.change(isDark.value ? 'fastForwardDark' : 'fastForwardLight')
}
</script>

<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" :permanent="!mobile" :temporary="mobile">
      <div class="d-flex align-center px-4 py-4">
        <v-avatar color="primary" size="40" rounded="lg" class="mr-3">
          <v-icon icon="mdi-truck-fast-outline" color="white" />
        </v-avatar>
        <div>
          <div class="text-subtitle-1 font-weight-bold lh-1">FastForward</div>
          <div class="text-caption text-medium-emphasis">Logistics</div>
        </div>
      </div>
      <v-divider />
      <v-list density="comfortable" nav>
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
          rounded="lg"
        />
      </v-list>
      <template #append>
        <div class="pa-3">
          <v-card color="surface-bright" flat rounded="lg" class="pa-3">
            <div class="text-caption text-medium-emphasis">Operations Command</div>
            <div class="text-body-2 font-weight-medium">Internal use only</div>
          </v-card>
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar flat border>
      <v-app-bar-nav-icon v-if="mobile" @click="drawer = !drawer" />
      <v-app-bar-title class="font-weight-bold">FastForward Logistics</v-app-bar-title>
      <v-spacer />
      <v-btn
        :icon="isDark ? 'mdi-weather-night' : 'mdi-weather-sunny'"
        variant="text"
        @click="toggleTheme"
      />
      <v-btn icon="mdi-bell-outline" variant="text" />
      <v-btn icon="mdi-account-circle" variant="text" />
    </v-app-bar>

    <v-main>
      <v-container fluid class="pa-4 pa-md-6">
        <RouterView />
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.lh-1 {
  line-height: 1.1;
}
</style>
