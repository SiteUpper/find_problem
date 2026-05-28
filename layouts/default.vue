<!-- layouts/default.vue -->
<template>
  <div class="min-h-screen flex flex-col">
    <!-- Global Header (if needed) -->
    <header class="bg-white shadow-sm">
      <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <NuxtLink to="/" class="text-xl font-bold text-gray-900 hover:text-primary-600 transition-colors duration-200">
          PropertyHub
        </NuxtLink>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Global Footer (if needed) -->
    <footer class="bg-white border-t border-gray-200 mt-auto">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p class="text-center text-sm text-gray-500">
          © {{ new Date().getFullYear() }} PropertyHub. All rights reserved.
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
// Default layout script
</script>