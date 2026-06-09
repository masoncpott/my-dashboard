import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// FastForward Logistics brand palette — a modern indigo/cyan scheme that is
// distinct from the Vue defaults. Ships with matched light and dark themes.
const fastForwardDark = {
  dark: true,
  colors: {
    background: '#0F1117',
    surface: '#171A22',
    'surface-bright': '#1F232E',
    'surface-variant': '#2A2F3C',
    'on-surface-variant': '#C7CCD9',
    primary: '#7C83FF',
    secondary: '#2DD4BF',
    accent: '#22D3EE',
    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#38BDF8',
  },
}

const fastForwardLight = {
  dark: false,
  colors: {
    background: '#F5F6FA',
    surface: '#FFFFFF',
    'surface-bright': '#FFFFFF',
    'surface-variant': '#E8EAF1',
    'on-surface-variant': '#4B5163',
    primary: '#4F46E5',
    secondary: '#0D9488',
    accent: '#0891B2',
    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626',
    info: '#0284C7',
  },
}

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'fastForwardDark',
    themes: {
      fastForwardDark,
      fastForwardLight,
    },
  },
  defaults: {
    VCard: { rounded: 'lg' },
  },
})

export default vuetify
