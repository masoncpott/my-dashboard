<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <v-card border flat rounded="lg" class="h-100">
    <v-card-title class="text-subtitle-1 font-weight-bold">{{ title }}</v-card-title>
    <v-card-subtitle v-if="subtitle">{{ subtitle }}</v-card-subtitle>
    <v-card-text>
      <slot />
    </v-card-text>
  </v-card>
</template>
