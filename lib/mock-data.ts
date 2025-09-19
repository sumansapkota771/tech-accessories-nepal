// Mock data for development/demo purposes
export const mockProducts = [
  {
    id: "1",
    name: "Wireless Bluetooth Headphones",
    description: "High-quality wireless headphones with noise cancellation",
    price: 2999,
    original_price: 3999,
    category_id: "1",
    image_url: "/placeholder.jpg",
    images: ["/placeholder.jpg"],
    stock_quantity: 50,
    is_featured: true,
    is_active: true,
    specifications: {
      "Battery Life": "30 hours",
      "Connectivity": "Bluetooth 5.0",
      "Noise Cancellation": "Active"
    },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    categories: {
      id: "1",
      name: "Audio",
      description: "Audio accessories and equipment",
      image_url: "/placeholder.jpg",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z"
    }
  },
  {
    id: "2",
    name: "iPhone 15 Pro Max Case",
    description: "Premium protective case with MagSafe compatibility",
    price: 1299,
    original_price: 1599,
    category_id: "2",
    image_url: "/placeholder.jpg",
    images: ["/placeholder.jpg"],
    stock_quantity: 100,
    is_featured: true,
    is_active: true,
    specifications: {
      "Material": "Silicone",
      "Compatibility": "iPhone 15 Pro Max",
      "MagSafe": "Yes"
    },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    categories: {
      id: "2",
      name: "Phone Cases",
      description: "Protective cases for smartphones",
      image_url: "/placeholder.jpg",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z"
    }
  },
  {
    id: "3",
    name: "USB-C Fast Charger",
    description: "65W USB-C fast charger with multiple ports",
    price: 2499,
    original_price: 2999,
    category_id: "3",
    image_url: "/placeholder.jpg",
    images: ["/placeholder.jpg"],
    stock_quantity: 75,
    is_featured: true,
    is_active: true,
    specifications: {
      "Power": "65W",
      "Ports": "USB-C x2, USB-A x1",
      "Fast Charging": "Yes"
    },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    categories: {
      id: "3",
      name: "Chargers",
      description: "Power adapters and charging accessories",
      image_url: "/placeholder.jpg",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z"
    }
  },
  {
    id: "4",
    name: "Wireless Mouse",
    description: "Ergonomic wireless mouse with RGB lighting",
    price: 1999,
    original_price: 2499,
    category_id: "4",
    image_url: "/placeholder.jpg",
    images: ["/placeholder.jpg"],
    stock_quantity: 60,
    is_featured: true,
    is_active: true,
    specifications: {
      "Connectivity": "Wireless 2.4GHz",
      "DPI": "16000",
      "RGB": "Yes"
    },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    categories: {
      id: "4",
      name: "Computer Accessories",
      description: "Computer peripherals and accessories",
      image_url: "/placeholder.jpg",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z"
    }
  }
]

export const mockCategories = [
  {
    id: "1",
    name: "Audio",
    description: "Audio accessories and equipment",
    image_url: "/placeholder.svg?height=80&width=80",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "2",
    name: "Phone Cases",
    description: "Protective cases for smartphones",
    image_url: "/placeholder.svg?height=80&width=80",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "3",
    name: "Chargers",
    description: "Power adapters and charging accessories",
    image_url: "/placeholder.svg?height=80&width=80",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "4",
    name: "Computer Accessories",
    description: "Computer peripherals and accessories",
    image_url: "/placeholder.svg?height=80&width=80",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "5",
    name: "Cables",
    description: "USB cables and connectors",
    image_url: "/placeholder.svg?height=80&width=80",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: "6",
    name: "Storage",
    description: "Memory cards and storage devices",
    image_url: "/placeholder.svg?height=80&width=80",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
]
