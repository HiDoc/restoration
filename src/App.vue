<template>
  <main class="p-5">
    <router-view />
  </main>
</template>

<script setup lang="ts">
// Main App component with router outlet
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Courier New', monospace;
}

#app {
  width: 100vw;
  height: 100vh;
}
</style>