# Property Catalog - Nuxt 3 Dynamic Filtering & Pagination Module

A full-featured, SSR-enabled property catalog module built with **Nuxt 3**, featuring dynamic filtering, responsive design, and skeleton loaders.

## 🚀 Features

| Feature | Description |
|---------|-------------|
| **SSR Support** | Server-side rendering via Nuxt 3 for SEO-friendly pages |
| **Dynamic Filtering** | Real-time search, property type selection, price range sliders |
| **URL Sync** | Filters automatically update the URL without page reloads |
| **Responsive Design** | Mobile-first layout with slide-up filter panel on small screens |
| **Skeleton Loaders** | Smooth loading states using Tailwind's `animate-pulse` |
| **Pagination** | Full pagination controls with smart page number display |

## 📁 Project Structure

```
nuxt-app/
├── app.vue                          # Root component
├── nuxt.config.ts                   # Nuxt configuration
├── tailwind.config.js               # Tailwind CSS config
├── package.json                     # Dependencies & scripts
│
├── assets/
│   └── css/
│       └── main.css                 # Global styles with Tailwind directives
│
├── layouts/
│   └── default.vue                  # Default layout wrapper
│
├── pages/
│   └── properties/
│       └── index.vue                # Main catalog page with filters
│
└── server/
    └── api/
        └── properties.get.ts        # Server-side API handler
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Step-by-Step

```bash
# 1. Install dependencies
npm install

# 2. Start development server (with hot reload)
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build locally
npm run preview
```

## 🔧 Configuration

### Environment Variables (Optional)

Create a `.env` file in the project root:

```env
NUXT_PUBLIC_API_BASE=/api
NUXT_PER_PAGE=6
```

### Tailwind Customization

The `tailwind.config.js` includes custom colors and animations. Modify as needed:

```js
theme: {
  extend: {
    colors: {
      primary: { /* ... */ }
    },
    animation: {
      'slide-up': 'slideUp 0.3s ease-out',
      // ...
    }
  }
}
```

## 📡 API Endpoints

### GET `/api/properties`

Query Parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `search` | string | Search by title, description, or city |
| `type` | enum | Filter by property type: `apartment`, `house`, `commercial` |
| `min_price` | number | Minimum price filter |
| `max_price` | number | Maximum price filter |
| `page` | number | Page number (default: 1) |
| `per_page` | number | Items per page (default: 6, max: 50) |

**Response Format:**

```json
{
  "success": true,
  "data": [ /* array of properties */ ],
  "meta": {
    "total": 12,
    "page": 1,
    "per_page": 6,
    "total_pages": 2,
    "has_next_page": true,
    "has_prev_page": false
  }
}
```

## 🎨 Component Breakdown

### `pages/properties/index.vue`

| Section | Functionality |
|---------|---------------|
| **Header** | Page title + mobile filter toggle button |
| **Mobile Filters** | Slide-up panel (`fixed bottom-0 z-50 w-full`) with all filter controls |
| **Desktop Sidebar** | Sticky left sidebar (`lg:block w-80 flex-shrink-0`) with filters |
| **Property Grid** | Responsive grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` |
| **Skeleton Loader** | Animated placeholders during data fetch (`animate-pulse`) |
| **Pagination** | Smart page number display + prev/next navigation |

### `server/api/properties.get.ts`

The server route handles:
1. Query parameter extraction via `getQuery(event)`
2. Type validation for all filters
3. In-memory data filtering (mock database)
4. Pagination calculation
5. JSON response with metadata

## 🧪 Testing the Module

### Manual Testing Checklist

- [ ] **Filters**: Change search query, property type, and price range — verify results update
- [ ] **URL Sync**: Verify URL updates when filters change (no page reload)
- [ ] **Mobile View**: Resize browser to < 1024px — filter panel should slide up from bottom
- [ ] **Desktop View**: On large screens, sidebar should be fixed on the left
- [ ] **Skeleton Loader**: Slow down network in DevTools — verify skeleton animation appears
- [ ] **Pagination**: Navigate between pages — verify correct properties load
- [ ] **Empty State**: Apply filters that return no results — verify empty state message

## 📝 License

MIT © 2024
