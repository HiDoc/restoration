<template>
  <div class="min-h-screen">
    <div class="sci-container py-8">
      <!-- Header -->
      <div class="sci-header mb-8">
        <h1 class="sci-header-title text-3xl">
          🧬 Scientific Game UI Component Library
          <span class="sci-header-badge">v1.0</span>
        </h1>
        <p class="sci-header-subtitle text-lg">
          A Bootstrap-like component system designed for scientific simulation games
        </p>
      </div>

      <!-- Navigation -->
      <nav class="sci-nav mb-8">
        <button
          v-for="section in sections"
          :key="section.id"
          class="sci-nav-item"
          :class="{ 'sci-nav-item-active': activeSection === section.id }"
          @click="activeSection = section.id"
        >
          {{ section.name }}
        </button>
      </nav>

      <!-- Content -->
      <div class="space-y-12">
        <!-- Buttons Section -->
        <section v-if="activeSection === 'buttons'" class="space-y-6">
          <h2 class="text-2xl font-bold text-primary-400">Buttons</h2>
          
          <div class="sci-card">
            <div class="sci-card-header">
              <h3 class="font-semibold">Button Variants</h3>
            </div>
            <div class="sci-card-body">
              <div class="flex flex-wrap gap-3 mb-4">
                <button class="sci-btn-primary">Primary</button>
                <button class="sci-btn-secondary">Secondary</button>
                <button class="sci-btn-outline">Outline</button>
                <button class="sci-btn-ghost">Ghost</button>
                <button class="sci-btn-danger">Danger</button>
              </div>
              
              <h4 class="font-medium mb-2 text-gray-400">Sizes</h4>
              <div class="flex flex-wrap gap-3 items-end">
                <button class="sci-btn-primary sci-btn-sm">Small</button>
                <button class="sci-btn-primary">Default</button>
                <button class="sci-btn-primary sci-btn-lg">Large</button>
                <button class="sci-btn-primary sci-btn-xl">Extra Large</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Cards Section -->
        <section v-if="activeSection === 'cards'" class="space-y-6">
          <h2 class="text-2xl font-bold text-primary-400">Cards & Panels</h2>
          
          <div class="sci-grid-3">
            <div class="sci-card">
              <div class="sci-card-header">
                <h3 class="font-semibold">Basic Card</h3>
              </div>
              <div class="sci-card-body">
                <p class="text-gray-400">Standard card with header and body.</p>
              </div>
            </div>
            
            <div class="sci-panel-elevated">
              <h3 class="font-semibold text-primary-400 mb-2">Elevated Panel</h3>
              <p class="text-gray-400">Panel with primary border glow.</p>
            </div>
            
            <div class="sci-panel-warning">
              <h3 class="font-semibold text-secondary-400 mb-2">Warning Panel</h3>
              <p class="text-gray-400">Panel with warning styling.</p>
            </div>
          </div>
        </section>

        <!-- Forms Section -->
        <section v-if="activeSection === 'forms'" class="space-y-6">
          <h2 class="text-2xl font-bold text-primary-400">Forms</h2>
          
          <div class="sci-card max-w-2xl">
            <div class="sci-card-header">
              <h3 class="font-semibold">Form Controls</h3>
            </div>
            <div class="sci-card-body space-y-4">
              <div>
                <label class="sci-label">Species Name</label>
                <input class="sci-input" placeholder="Enter species name" />
                <p class="sci-help-text">The scientific name of the specimen</p>
              </div>
              
              <div>
                <label class="sci-label">Habitat Type</label>
                <select class="sci-select">
                  <option>Forest</option>
                  <option>Grassland</option>
                  <option>Aquatic</option>
                  <option>Desert</option>
                </select>
              </div>
              
              <div>
                <label class="sci-label">Research Notes</label>
                <textarea class="sci-textarea" rows="3" placeholder="Enter observations..."></textarea>
              </div>
              
              <div class="flex items-center space-x-2">
                <input type="checkbox" class="sci-checkbox" id="endangered" />
                <label for="endangered" class="sci-label mb-0">Endangered species</label>
              </div>
            </div>
          </div>
        </section>

        <!-- Data Display Section -->
        <section v-if="activeSection === 'data'" class="space-y-6">
          <h2 class="text-2xl font-bold text-primary-400">Data Display</h2>
          
          <!-- Stats Grid -->
          <div class="sci-grid-4">
            <div class="sci-card">
              <div class="sci-card-body">
                <div class="sci-stat">
                  <div class="sci-stat-label">Total Population</div>
                  <div class="sci-stat-value">12,847</div>
                  <div class="sci-stat-change-positive">
                    ↗ +5.2% from last cycle
                  </div>
                </div>
              </div>
            </div>
            
            <div class="sci-card">
              <div class="sci-card-body">
                <div class="sci-stat">
                  <div class="sci-stat-label">Biodiversity Index</div>
                  <div class="sci-stat-value">0.847</div>
                  <div class="sci-stat-change-negative">
                    ↘ -2.1% declining
                  </div>
                </div>
              </div>
            </div>
            
            <div class="sci-card">
              <div class="sci-card-body">
                <div class="sci-stat">
                  <div class="sci-stat-label">Ecosystem Health</div>
                  <div class="sci-stat-value">92%</div>
                  <div class="sci-progress mt-2">
                    <div class="sci-progress-bar" style="width: 92%"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="sci-card">
              <div class="sci-card-body">
                <div class="sci-stat">
                  <div class="sci-stat-label">Active Research</div>
                  <div class="sci-stat-value">7</div>
                  <div class="flex space-x-1 mt-2">
                    <span class="sci-badge-primary">3 Running</span>
                    <span class="sci-badge-outline">4 Pending</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Badges -->
          <div class="sci-card">
            <div class="sci-card-header">
              <h3 class="font-semibold">Badges & Tags</h3>
            </div>
            <div class="sci-card-body">
              <div class="flex flex-wrap gap-2">
                <span class="sci-badge-primary">Primary</span>
                <span class="sci-badge-secondary">Secondary</span>
                <span class="sci-badge-success">Healthy</span>
                <span class="sci-badge-warning">Unstable</span>
                <span class="sci-badge-danger">Critical</span>
                <span class="sci-badge-outline">Neutral</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Game Components Section -->
        <section v-if="activeSection === 'game'" class="space-y-6">
          <h2 class="text-2xl font-bold text-primary-400">Game Components</h2>
          
          <!-- Species Card -->
          <div class="sci-grid-3">
            <div class="species-card">
              <div class="species-card-header">
                <div>
                  <div class="species-card-name">Lumina Grass</div>
                  <div class="species-card-id">#LG-001</div>
                </div>
                <span class="sci-badge-success">Thriving</span>
              </div>
              <div class="species-card-stats">
                <div class="species-stat">
                  <span class="species-stat-label">Population</span>
                  <span class="species-stat-value text-green-400">2,847</span>
                </div>
                <div class="species-stat">
                  <span class="species-stat-label">Health</span>
                  <span class="species-stat-value text-primary-400">94%</span>
                </div>
                <div class="species-stat">
                  <span class="species-stat-label">Growth Rate</span>
                  <span class="species-stat-value text-secondary-400">+12%</span>
                </div>
                
                <div class="species-trait-grid">
                  <div class="species-trait-high">Photosynthesis</div>
                  <div class="species-trait-medium">Resilience</div>
                  <div class="species-trait-high">Adaptation</div>
                  <div class="species-trait-low">Competition</div>
                </div>
              </div>
            </div>
            
            <!-- Ecosystem Health Indicator -->
            <div class="space-y-3">
              <div class="eco-health-excellent">
                <span class="w-3 h-3 bg-green-400 rounded-full"></span>
                <span>Ecosystem Excellent</span>
              </div>
              <div class="eco-health-good">
                <span class="w-3 h-3 bg-primary-400 rounded-full"></span>
                <span>Population Stable</span>
              </div>
              <div class="eco-health-moderate">
                <span class="w-3 h-3 bg-yellow-400 rounded-full"></span>
                <span>Diversity Moderate</span>
              </div>
            </div>
            
            <!-- Research Station -->
            <div class="research-station">
              <div class="research-header">
                <div class="research-icon">
                  🔬
                </div>
                <div>
                  <div class="research-title">Lab Alpha</div>
                  <div class="research-subtitle">Genetic Analysis</div>
                </div>
              </div>
              
              <div class="research-progress">
                <div class="research-progress-label">
                  <span class="text-gray-300">Progress</span>
                  <span class="text-primary-400">67%</span>
                </div>
                <div class="research-progress-bar">
                  <div class="sci-progress-bar" style="width: 67%"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Genetic Traits -->
          <div class="sci-card">
            <div class="sci-card-header">
              <h3 class="font-semibold">Genetic Traits</h3>
            </div>
            <div class="sci-card-body space-y-3">
              <div class="genetic-trait">
                <div class="genetic-trait-label">Vitality</div>
                <div class="genetic-trait-bar">
                  <div class="genetic-trait-fill-high" style="width: 85%"></div>
                </div>
                <div class="genetic-trait-value">85%</div>
              </div>
              
              <div class="genetic-trait">
                <div class="genetic-trait-label">Growth</div>
                <div class="genetic-trait-bar">
                  <div class="genetic-trait-fill-medium" style="width: 62%"></div>
                </div>
                <div class="genetic-trait-value">62%</div>
              </div>
              
              <div class="genetic-trait">
                <div class="genetic-trait-label">Resilience</div>
                <div class="genetic-trait-bar">
                  <div class="genetic-trait-fill-low" style="width: 34%"></div>
                </div>
                <div class="genetic-trait-value">34%</div>
              </div>
            </div>
          </div>

          <!-- Simulation Controls -->
          <div class="sim-control-panel">
            <div class="sim-control-group">
              <div class="sim-control-title">
                <span class="sim-control-title-icon">⏱️</span>
                <span>Time Controls</span>
              </div>
              <div class="sim-speed-controls">
                <button class="sim-speed-btn-active">1x</button>
                <button class="sim-speed-btn">2x</button>
                <button class="sim-speed-btn">5x</button>
                <button class="sim-speed-btn">10x</button>
              </div>
            </div>
            
            <div class="sim-progress-indicator">
              <div class="sim-time-display">Year 15, Day 127</div>
              <div class="sim-stats-grid">
                <div class="sci-stat">
                  <div class="sci-stat-label">Cycles</div>
                  <div class="sci-stat-value text-base">5,847</div>
                </div>
                <div class="sci-stat">
                  <div class="sci-stat-label">Events</div>
                  <div class="sci-stat-value text-base">23</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Utilities Section -->
        <section v-if="activeSection === 'utilities'" class="space-y-6">
          <h2 class="text-2xl font-bold text-primary-400">Utilities & Helpers</h2>
          
          <div class="sci-card">
            <div class="sci-card-header">
              <h3 class="font-semibold">Loading States</h3>
            </div>
            <div class="sci-card-body space-y-4">
              <div class="flex items-center space-x-4">
                <div class="sci-spinner"></div>
                <span>Loading...</span>
                <div class="sci-spinner-lg"></div>
              </div>
              
              <div class="space-y-2">
                <div class="sci-skeleton h-4 w-3/4"></div>
                <div class="sci-skeleton h-4 w-1/2"></div>
                <div class="sci-skeleton h-4 w-2/3"></div>
              </div>
            </div>
          </div>
          
          <div class="sci-card">
            <div class="sci-card-header">
              <h3 class="font-semibold">Alerts</h3>
            </div>
            <div class="sci-card-body space-y-3">
              <div class="sci-alert-info">
                <div class="sci-alert-title">Information</div>
                <div class="sci-alert-description">New species discovered in sector 7-B</div>
              </div>
              
              <div class="sci-alert-success">
                <div class="sci-alert-title">Success</div>
                <div class="sci-alert-description">Ecosystem balance restored</div>
              </div>
              
              <div class="sci-alert-warning">
                <div class="sci-alert-title">Warning</div>
                <div class="sci-alert-description">Population declining in northern region</div>
              </div>
              
              <div class="sci-alert-danger">
                <div class="sci-alert-title">Critical</div>
                <div class="sci-alert-description">Ecosystem collapse imminent</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeSection = ref('buttons')

const sections = [
  { id: 'buttons', name: 'Buttons' },
  { id: 'cards', name: 'Cards & Panels' },
  { id: 'forms', name: 'Forms' },
  { id: 'data', name: 'Data Display' },
  { id: 'game', name: 'Game Components' },
  { id: 'utilities', name: 'Utilities' },
]
</script>
