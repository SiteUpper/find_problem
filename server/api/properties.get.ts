// server/api/properties.get.ts
import type { H3Event } from 'h3'

// Type definitions for Property data
export interface Property {
  id: number
  title: string
  description: string
  type: 'apartment' | 'house' | 'commercial'
  price: number
  area: number
  rooms: number
  address: string
  city: string
  image: string
  createdAt: string
}

// Mock database of properties
const PROPERTIES_DB: Property[] = [
  {
    id: 1,
    title: 'Modern Apartment in City Center',
    description: 'Beautiful modern apartment with great views and amenities',
    type: 'apartment',
    price: 250000,
    area: 85,
    rooms: 3,
    address: '123 Main Street',
    city: 'Moscow',
    image: '/images/property-1.jpg',
    createdAt: '2024-01-15'
  },
  {
    id: 2,
    title: 'Luxury Villa with Pool',
    description: 'Spacious villa with private pool and garden',
    type: 'house',
    price: 750000,
    area: 320,
    rooms: 6,
    address: '456 Oak Avenue',
    city: 'Sochi',
    image: '/images/property-2.jpg',
    createdAt: '2024-01-20'
  },
  {
    id: 3,
    title: 'Cozy Studio Apartment',
    description: 'Perfect starter home in a quiet neighborhood',
    type: 'apartment',
    price: 180000,
    area: 45,
    rooms: 1,
    address: '789 Pine Road',
    city: 'Saint Petersburg',
    image: '/images/property-3.jpg',
    createdAt: '2024-02-01'
  },
  {
    id: 4,
    title: 'Family House with Garden',
    description: 'Ideal family home with large backyard and garage',
    type: 'house',
    price: 450000,
    area: 210,
    rooms: 4,
    address: '321 Elm Street',
    city: 'Kazan',
    image: '/images/property-4.jpg',
    createdAt: '2024-02-10'
  },
  {
    id: 5,
    title: 'Penthouse with Panoramic View',
    description: 'Luxury penthouse with stunning city views',
    type: 'apartment',
    price: 980000,
    area: 150,
    rooms: 4,
    address: '654 Skyline Boulevard',
    city: 'Moscow',
    image: '/images/property-5.jpg',
    createdAt: '2024-02-15'
  },
  {
    id: 6,
    title: 'Commercial Office Space',
    description: 'Prime location office space for businesses',
    type: 'commercial',
    price: 350000,
    area: 120,
    rooms: 3,
    address: '987 Business Center',
    city: 'Novosibirsk',
    image: '/images/property-6.jpg',
    createdAt: '2024-02-20'
  },
  {
    id: 7,
    title: 'Beachfront Condo',
    description: 'Stunning beachfront property with ocean views',
    type: 'apartment',
    price: 650000,
    area: 110,
    rooms: 3,
    address: '111 Ocean Drive',
    city: 'Sochi',
    image: '/images/property-7.jpg',
    createdAt: '2024-03-01'
  },
  {
    id: 8,
    title: 'Country Cottage',
    description: 'Peaceful cottage surrounded by nature',
    type: 'house',
    price: 280000,
    area: 95,
    rooms: 3,
    address: '222 Forest Lane',
    city: 'Yalta',
    image: '/images/property-8.jpg',
    createdAt: '2024-03-10'
  },
  {
    id: 9,
    title: 'Downtown Loft',
    description: 'Industrial style loft in the heart of the city',
    type: 'apartment',
    price: 420000,
    area: 130,
    rooms: 2,
    address: '333 Urban Street',
    city: 'Moscow',
    image: '/images/property-9.jpg',
    createdAt: '2024-03-15'
  },
  {
    id: 10,
    title: 'Suburban Family Home',
    description: 'Safe neighborhood perfect for families with children',
    type: 'house',
    price: 520000,
    area: 240,
    rooms: 5,
    address: '444 Suburb Avenue',
    city: 'Ekaterinburg',
    image: '/images/property-10.jpg',
    createdAt: '2024-03-20'
  },
  {
    id: 11,
    title: 'Student Apartment',
    description: 'Affordable housing near universities',
    type: 'apartment',
    price: 150000,
    area: 35,
    rooms: 1,
    address: '555 Student Street',
    city: 'Tomsk',
    image: '/images/property-11.jpg',
    createdAt: '2024-04-01'
  },
  {
    id: 12,
    title: 'Mountain Retreat House',
    description: 'Secluded mountain home with breathtaking views',
    type: 'house',
    price: 890000,
    area: 280,
    rooms: 5,
    address: '666 Mountain View Road',
    city: 'Krasnodar',
    image: '/images/property-12.jpg',
    createdAt: '2024-04-10'
  }
]

// Query parameters interface
interface PropertyQueryParams {
  search?: string
  type?: 'apartment' | 'house' | 'commercial'
  min_price?: number
  max_price?: number
  page?: number
  per_page?: number
}

export default defineEventHandler(async (event: H3Event) => {
  // Get query parameters from the request
  const queryParams = getQuery<PropertyQueryParams>(event)
  
  // Validate and set default values for pagination
  let page = Number(queryParams.page) || 1
  let perPage = Number(queryParams.per_page) || 6
  
  // Ensure minimum/maximum bounds for pagination
  if (page < 1) page = 1
  if (perPage < 1 || perPage > 50) perPage = 6
  
  // Start with all properties
  let filteredProperties = [...PROPERTIES_DB]
  
  // Apply search filter (title, description, city)
  if (queryParams.search && typeof queryParams.search === 'string') {
    const searchTerm = queryParams.search.toLowerCase()
    filteredProperties = filteredProperties.filter(property =>
      property.title.toLowerCase().includes(searchTerm) ||
      property.description.toLowerCase().includes(searchTerm) ||
      property.city.toLowerCase().includes(searchTerm)
    )
  }
  
  // Apply property type filter
  if (queryParams.type && ['apartment', 'house', 'commercial'].includes(queryParams.type)) {
    filteredProperties = filteredProperties.filter(property =>
      property.type === queryParams.type
    )
  }
  
  // Apply price range filters
  if (queryParams.min_price !== undefined) {
    const minPrice = Number(queryParams.min_price)
    if (!isNaN(minPrice)) {
      filteredProperties = filteredProperties.filter(property =>
        property.price >= minPrice
      )
    }
  }
  
  if (queryParams.max_price !== undefined) {
    const maxPrice = Number(queryParams.max_price)
    if (!isNaN(maxPrice)) {
      filteredProperties = filteredProperties.filter(property =>
        property.price <= maxPrice
      )
    }
  }
  
  // Calculate total count after filtering
  const totalCount = filteredProperties.length
  
  // Apply pagination
  const startIndex = (page - 1) * perPage
  const endIndex = startIndex + perPage
  const paginatedProperties = filteredProperties.slice(startIndex, endIndex)
  
  // Calculate total pages
  const totalPages = Math.ceil(totalCount / perPage)
  
  // Return response with properties and metadata
  return {
    success: true,
    data: paginatedProperties,
    meta: {
      total: totalCount,
      page,
      per_page: perPage,
      total_pages: totalPages,
      has_next_page: page < totalPages,
      has_prev_page: page > 1
    }
  }
})