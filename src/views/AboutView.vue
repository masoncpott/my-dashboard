<template>
  <div>
    <h1 class="text-h5 font-weight-bold mb-1">About this dashboard</h1>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Internal operations intelligence for FastForward Logistics
    </div>

    <v-row>
      <v-col cols="12" md="7">
        <v-card border flat rounded="lg" class="mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold">Purpose</v-card-title>
          <v-card-text class="text-body-2">
            FastForward Logistics is a mid-size freight and supply chain company whose
            operations team had been running the business out of spreadsheets. This
            dashboard gives the VP of Operations a single, leadership-ready view of how
            the network is performing: shipment volume, on-time delivery, regional
            performance, and open exceptions — filterable by any date range from
            January 1, 2024 to today.
          </v-card-text>
        </v-card>

        <v-card border flat rounded="lg">
          <v-card-title class="text-subtitle-1 font-weight-bold">What you're looking at</v-card-title>
          <v-list lines="two" density="comfortable" bg-color="transparent">
            <v-list-item
              prepend-icon="mdi-package-variant-closed"
              title="Shipment Volume"
              subtitle="Total packages dispatched, auto-bucketed by day, week, or month"
            />
            <v-list-item
              prepend-icon="mdi-clock-check-outline"
              title="On-Time Delivery"
              subtitle="Share of shipments delivered on schedule across the network"
            />
            <v-list-item
              prepend-icon="mdi-map-marker-radius-outline"
              title="Regional Performance"
              subtitle="Volume and reliability across the five operating regions"
            />
            <v-list-item
              prepend-icon="mdi-alert-circle-outline"
              title="Open Exceptions"
              subtitle="Delays, customs holds, damage, and other active issues by type"
            />
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="5">
        <v-card border flat rounded="lg">
          <v-card-title class="text-subtitle-1 font-weight-bold">Built with</v-card-title>
          <v-card-text>
            <v-chip-group column>
              <v-chip prepend-icon="mdi-vuejs" variant="tonal">Vue 3 + TypeScript</v-chip>
              <v-chip prepend-icon="mdi-material-design" variant="tonal">Vuetify</v-chip>
              <v-chip prepend-icon="mdi-chart-line" variant="tonal">Chart.js</v-chip>
              <v-chip prepend-icon="mdi-lightning-bolt" variant="tonal">Vite</v-chip>
            </v-chip-group>
            <v-alert
              type="info"
              variant="tonal"
              density="compact"
              class="mt-3"
              text="Figures shown are realistic sample data generated for this prototype."
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>
