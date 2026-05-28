<!-- pages/properties/index.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header Section -->
    <header class="bg-white shadow-sm sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-gray-900">Property Catalog</h1>
          
          <!-- Mobile Filter Toggle Button -->
          <button
            @click="toggleMobileFilters"
            class="lg:hidden inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex flex-col lg:flex-row gap-8">
        
        <!-- Mobile Filter Overlay Backdrop -->
        <transition
          enter-active-class="transition-opacity duration-300"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-opacity duration-300"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="showMobileFilters"
            @click="toggleMobileFilters"
            class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          />
        </transition>

        <!-- Mobile Filter Panel (Slides up from bottom) -->
        <transition
          enter-active-class="transition-transform duration-300 ease-out"
          enter-from-class="translate-y-full"
          enter-to-class="translate-y-0"
          leave-active-class="transition-transform duration-300 ease-in"
          leave-from-class="translate-y-0"
          leave-to-class="translate-y-full"
        >
          <div
            v-if="showMobileFilters"
            class="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto lg:hidden animate-slide-up"
          >
            <!-- Mobile Filter Handle -->
            <div class="sticky top-0 bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-900">Filters</h2>
              <button
                @click="toggleMobileFilters"
                class="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Mobile Filter Content -->
            <div class="p-4 space-y-6">
              <!-- Search Input -->
              <div>
                <label for="search-mobile" class="block text-sm font-medium text-gray-700 mb-1">
                  Search Properties
                </label>
                <input
                  id="search-mobile"
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search by title, city..."
                  class="input-field"
                />
              </div>

              <!-- Property Type Select -->
              <div>
                <label for="type-mobile" class="block text-sm font-medium text-gray-700 mb-1">
                  Property Type
                </label>
                <select
                  id="type-mobile"
                  v-model="propertyType"
                  class="select-field"
                >
                  <option value="">All Types</option>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>

              <!-- Price Range Slider -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Price Range
                </label>
                <div class="space-y-3">
                  <div>
                    <div class="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Min: {{ formatPrice(minPrice) }}</span>
                      <span>Max: {{ formatPrice(maxPrice) }}</span>
                    </div>
                    <input
                      v-model="minPrice"
                      type="range"
                      min="0"
                      :max="maxPrice"
                      step="10000"
                      class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                  </div>
                  <div>
                    <input
                      v-model="maxPrice"
                      type="range"
                      :min="minPrice"
                      max="2000000"
                      step="10000"
                      class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                  </div>
                </div>
              </div>

              <!-- Apply Filters Button (Mobile Only) -->
              <div>
                <button
                  @click="toggleMobileFilters"
                  class="w-full btn-primary"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </transition>

        <!-- Desktop Sidebar Filters (Fixed left) -->
        <aside class="hidden lg:block w-80 flex-shrink-0">
          <div class="sticky top-24 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <h2 class="text-lg font-semibold text-gray-900 pb-3 border-b border-gray-200">Filters</h2>
            
            <!-- Search Input -->
            <div>
              <label for="search" class="block text-sm font-medium text-gray-700 mb-1">
                Search Properties
              </label>
              <input
                id="search"
                v-model="searchQuery"
                type="text"
                placeholder="Search by title, city..."
                class="input-field"
              />
            </div>

            <!-- Property Type Select -->
            <div>
              <label for="type" class="block text-sm font-medium text-gray-700 mb-1">
                Property Type
              </label>
              <select
                id="type"
                v-model="propertyType"
                class="select-field"
              >
                <option value="">All Types</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <!-- Price Range Slider -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Price Range
              </label>
              <div class="space-y-3">
                <div>
                  <div class="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Min: {{ formatPrice(minPrice) }}</span>
                    <span>Max: {{ formatPrice(maxPrice) }}</span>
                  </div>
                  <input
                    v-model="minPrice"
                    type="range"
                    min="0"
                    :max="maxPrice"
                    step="10000"
                    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                </div>
                <div>
                  <input
                    v-model="maxPrice"
                    type="range"
                    :min="minPrice"
                    max="2000000"
                    step="10000"
                    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                </div>
              </div>
            </div>

            <!-- Reset Filters Button -->
            <div class="pt-4 border-t border-gray-200">
              <button
                @click="resetFilters"
                class="w-full btn-secondary"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </aside>

        <!-- Property Grid Section -->
        <section class="flex-1 min-w-0">
          <!-- Results Count and Sort Info -->
          <div v-if="!pending" class="mb-6 flex items-center justify-between">
            <p class="text-sm text-gray-600">
              Showing {{ properties.data?.length || 0 }} of {{ properties.meta?.total || 0 }} properties
            </p>
          </div>

          <!-- Skeleton Loader (Pending State) -->
          <div v-if="pending" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div
              v-for="index in 6"
              :key="index"
              class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <!-- Image Skeleton -->
              <div class="aspect-w-16 aspect-h-9 bg-gray-200 animate-pulse">
                <div class="w-full h-48 bg-gray-300" />
              </div>
              
              <!-- Content Skeleton -->
              <div class="p-5 space-y-3">
                <!-- Title Skeleton -->
                <div class="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
                <!-- Price Skeleton -->
                <div class="h-8 bg-gray-200 rounded animate-pulse w-1/2" />
                <!-- Description Skeleton -->
                <div class="space-y-2">
                  <div class="h-4 bg-gray-200 rounded animate-pulse" />
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
                </div>
                <!-- Details Skeleton -->
                <div class="flex gap-4 pt-2">
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-16" />
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-16" />
                  <div class="h-4 bg-gray-200 rounded animate-pulse w-16" />
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="!properties.data?.length"
            class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center"
          >
            <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 class="mt-4 text-lg font-medium text-gray-900">No properties found</h3>
            <p class="mt-2 text-sm text-gray-500">
              Try adjusting your filters or search terms to find what you're looking for.
            </p>
            <button
              @click="resetFilters"
              class="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
            >
              Reset Filters
            </button>
          </div>

          <!-- Property Cards Grid -->
          <div
            v-else
            class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            <div
              v-for="property in properties.data"
              :key="property.id"
              class="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <!-- Property Image -->
              <div class="relative overflow-hidden">
                <img
                  :src="property.image || '/images/placeholder.jpg'"
                  :alt="property.title"
                  class="w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                
                <!-- Property Type Badge -->
                <div class="absolute top-3 left-3">
                  <span
                    :class="{
                      'bg-blue-100 text-blue-800': property.type === 'apartment',
                      'bg-green-100 text-green-800': property.type === 'house',
                      'bg-purple-100 text-purple-800': property.type === 'commercial'
                    }"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                  >
                    {{ property.type }}
                  </span>
                </div>
              </div>

              <!-- Property Content -->
              <div class="p-5">
                <!-- Title -->
                <h3 class="text-lg font-semibold text-gray-900 line-clamp-1 group-hover:text-primary-600 transition-colors duration-200">
                  {{ property.title }}
                </h3>

                <!-- Price -->
                <p class="mt-2 text-2xl font-bold text-primary-600">
                  {{ formatPrice(property.price) }}
                </p>

                <!-- Description -->
                <p class="mt-2 text-sm text-gray-600 line-clamp-2">
                  {{ property.description }}
                </p>

                <!-- Property Details -->
                <div class="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  <div class="flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>{{ property.rooms }} rooms</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <span>{{ property.area }} m²</span>
                  </div>
                </div>

                <!-- Location -->
                <div class="mt-3 flex items-center gap-1 text-sm text-gray-500">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span class="truncate">{{ property.city }}, {{ property.address }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination Controls -->
          <nav
            v-if="!pending && properties.meta?.total_pages && properties.meta.total_pages > 1"
            class="mt-8 flex items-center justify-between border-t border-gray-200 pt-6"
          >
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-gray-700">
                  Page
                  <span class="font-medium">{{ properties.meta.page }}</span>
                  of
                  <span class="font-medium">{{ properties.meta.total_pages }}</span>
                </p>
              </div>

              <div>
                <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <!-- Previous Page Button -->
                  <button
                    @click="changePage(properties.meta.page - 1)"
                    :disabled="!properties.meta.has_prev_page"
                    :class="[
                      'relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium',
                      properties.meta.has_prev_page ? 'text-gray-500 hover:bg-gray-50' : 'text-gray-300 cursor-not-allowed'
                    ]"
                  >
                    <span class="sr-only">Previous</span>
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <!-- Page Numbers -->
                  <template v-for="pageNum in visiblePages" :key="pageNum">
                    <button
                      @click="changePage(pageNum)"
                      :class="[
                        'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                        pageNum === properties.meta.page
                          ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      ]"
                    >
                      {{ pageNum }}
                    </button>
                  </template>

                  <!-- Next Page Button -->
                  <button
                    @click="changePage(properties.meta.page + 1)"
                    :disabled="!properties.meta.has_next_page"
                    :class="[
                      'relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium',
                      properties.meta.has_next_page ? 'text-gray-500 hover:bg-gray-50' : 'text-gray-300 cursor-not-allowed'
                    ]"
                  >
                    <span class="sr-only">Next</span>
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>

            <!-- Mobile Pagination -->
            <div class="flex items-center justify-between sm:hidden w-full">
              <button
                @click="changePage(properties.meta.page - 1)"
                :disabled="!properties.meta.has_prev_page"
                :class="[
                  'relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md',
                  properties.meta.has_prev_page ? 'text-gray-700 bg-white hover:bg-gray-50' : 'text-gray-300 bg-gray-100 cursor-not-allowed'
                ]"
              >
                Previous
              </button>
              
              <span class="text-sm text-gray-700">
                {{ properties.meta.page }} / {{ properties.meta.total_pages }}
              </span>
              
              <button
                @click="changePage(properties.meta.page + 1)"
                :disabled="!properties.meta.has_next_page"
                :class="[
                  'relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md',
                  properties.meta.has_next_page ? 'text-gray-700 bg-white hover:bg-gray-50' : 'text-gray-300 bg-gray-100 cursor-not-allowed'
                ]"
              >
                Next
              </button>
            </div>
          </nav>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
// Import necessary composables and types
import { ref, computed, watch } from 'vue'
import type { Property } from '~/server/api/properties.get'

// Define page metadata for SEO
useHead({
  title: 'Property Catalog - Browse Available Properties',
  meta: [
    { name: 'description', content: 'Browse our extensive collection of properties. Filter by type, price, and location.' }
  ]
})

// Reactive state for filters
const searchQuery = ref<string>('')
const propertyType = ref<'apartment' | 'house' | 'commercial' | ''>('')
const minPrice = ref<number>(0)
const maxPrice = ref<number>(2000000)
const currentPage = ref<number>(1)

// Mobile filter panel state
const showMobileFilters = ref<boolean>(false)

// Toggle mobile filters visibility
const toggleMobileFilters = (): void => {
  showMobileFilters.value = !showMobileFilters.value
}

// Format price with currency symbol and commas
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price)
}

// Fetch properties with useFetch composable
const { data: properties, pending, error } = await useFetch<any>('/api/properties', {
  query: computed(() => ({
    search: searchQuery.value || undefined,
    type: propertyType.value || undefined,
    min_price: minPrice.value > 0 ? minPrice.value : undefined,
    max_price: maxPrice.value < 2000000 ? maxPrice.value : undefined,
    page: currentPage.value,
    per_page: 6
  })),
  key: `properties-${searchQuery.value}-${propertyType.value}-${minPrice.value}-${maxPrice.value}-${currentPage.value}`
})

// Handle errors
if (error.value) {
  console.error('Error fetching properties:', error.value)
}

// Calculate visible page numbers for pagination
const visiblePages = computed(() => {
  const current = properties.value?.meta?.page || 1
  const total = properties.value?.meta?.total_pages || 1
  const pages: number[] = []
  
  // Show maximum of 5 page numbers
  let start = Math.max(1, current - 2)
  let end = Math.min(total, start + 4)
  
  // Adjust start if we can show more pages at the beginning
  if (end - start < 4) {
    start = Math.max(1, end - 4)
  }
  
  // Generate page numbers
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

// Change page function
const changePage = (page: number): void => {
  const meta = properties.value?.meta
  if (!meta || page < 1 || page > meta.total_pages) return
  
  currentPage.value = page
  
  // Update URL without full page reload for SEO and shareability
  const queryParams = new URLSearchParams(window.location.search)
  queryParams.set('page', String(page))
  
  navigateTo({
    path: '/properties',
    query: Object.fromEntries(queryParams)
  }, { replace: true })
  
  // Scroll to top of results
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Reset all filters
const resetFilters = (): void => {
  searchQuery.value = ''
  propertyType.value = ''
  minPrice.value = 0
  maxPrice.value = 2000000
  currentPage.value = 1
  
  // Clear URL parameters
  navigateTo('/properties', { replace: true })
}

// Watch for filter changes and update URL accordingly (for SEO)
watch(
  [searchQuery, propertyType, minPrice, maxPrice],
  () => {
    const queryParams: Record<string, string> = {}
    
    if (searchQuery.value) queryParams.search = searchQuery.value
    if (propertyType.value) queryParams.type = propertyType.value
    if (minPrice.value > 0) queryParams.min_price = String(minPrice.value)
    if (maxPrice.value < 2000000) queryParams.max_price = String(maxPrice.value)
    
    // Reset to page 1 when filters change
    currentPage.value = 1
    queryParams.page = '1'
    
    navigateTo({
      path: '/properties',
      query: queryParams
    }, { replace: true })
  },
  { deep: true }
)

// Initialize filters from URL query parameters on page load (SSR support)
const route = useRoute()
if (route.query.search) searchQuery.value = route.query.search as string
if (route.query.type) propertyType.value = route.query.type as 'apartment' | 'house' | 'commercial'
if (route.query.min_price) minPrice.value = Number(route.query.min_price)
if (route.query.max_price) maxPrice.value = Number(route.query.max_price)
if (route.query.page) currentPage.value = Number(route.query.page)
</script>

<style scoped>
/* Additional custom styles if needed */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>