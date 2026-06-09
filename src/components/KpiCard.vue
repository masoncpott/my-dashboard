<script setup lang="ts">
defineProps<{
  title: string
  value: string
  icon: string
  color: string
  sub?: string
}>()
</script>

<template>
  <v-card border flat rounded="lg" class="h-100">
    <v-card-text class="d-flex align-center">
      <v-avatar :color="color" size="48" rounded="lg" class="mr-4">
        <v-icon :icon="icon" color="white" />
      </v-avatar>
      <div>
        <div class="text-caption text-medium-emphasis">{{ title }}</div>
        <div class="text-h6 font-weight-bold">{{ value }}</div>
        <div v-if="sub" class="text-caption text-medium-emphasis">{{ sub }}</div>
      </div>
    </v-card-text>
  </v-card>
</template>
