# Margros POS System

A comprehensive Point of Sale system built for restaurants and cafes, featuring AI-powered menu recognition, real-time order management, inventory tracking, and billing automation.

## ✨ Features

### 🍽️ Menu Management
- **AI-Powered OCR**: Extract menu items from photos using Groq's vision models
- **Category Management**: Automatic category creation and organization
- **Real-time Updates**: Live synchronization across all devices
- **Mobile Responsive**: Optimized for phones and tablets

### 📱 Order Management
- **Waiter Dashboard**: Table management and order taking
- **Kitchen Dashboard**: Order queue and preparation tracking
- **Real-time Status**: Live order status updates across stations

### 💰 Billing & Payments
- **Multi-Payment Methods**: Cash, Card, UPI, QR payments
- **Automatic Billing**: Smart bill generation with discounts
- **Inventory Deduction**: Automatic ingredient tracking
- **Payment History**: Complete transaction records

### 📦 Inventory Control
- **Smart Tracking**: Real-time inventory levels
- **Low Stock Alerts**: Automatic warning system
- **Usage Analytics**: Ingredient consumption tracking
- **CSV Import/Export**: Bulk inventory management

### 🔍 Camera Recognition
- **Menu Photo Upload**: Capture or upload menu images
- **Text Extraction**: Advanced OCR with confidence scoring
- **Structured Data**: Automatic menu item categorization
- **Image Storage**: Local storage with metadata

## 🚀 Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component library
- **Lucide React** - Beautiful icons

### Backend & Database
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Groq API** - AI-powered vision and language models
- **Next.js API Routes** - Server-side functionality

### AI & OCR
- **Groq Vision Models** - llama-3.2-90b-vision-preview for image analysis
- **Text Processing** - llama3-8b-8192 for text cleaning
- **Structured Extraction** - llama3-groq-70b-8192-tool-use-preview for JSON schema

## 🏛️ Architecture

The application follows a modern full-stack architecture with AI integration. The frontend provides real-time interfaces for restaurant operations, while the backend orchestrates AI-powered menu recognition and data management. OCR capabilities process menu images directly through Groq's vision models for seamless menu digitization.

```mermaid
graph TD
    %% ===========================================
    %% FRONTEND LAYER - User Interfaces
    %% ===========================================
    subgraph "Frontend Layer (Next.js + TypeScript)"
        A1["👨‍💼 Admin Dashboard<br/>• Menu Management<br/>• System Settings<br/>• Analytics"]
        A2["👨‍🍳 Kitchen Display<br/>• Order Queue<br/>• Preparation Status<br/>• Timer Management"]
        A3["🧑‍💼 Waiter Station<br/>• Table Management<br/>• Order Taking<br/>• Status Updates"]
        A4["💰 Billing Counter<br/>• Payment Processing<br/>• Bill Generation<br/>• Transaction History"]
        A5["📱 Mobile Interface<br/>• Responsive Design<br/>• Touch Optimized<br/>• Camera Integration"]
    end

    %% ===========================================
    %% OCR & AI PROCESSING LAYER
    %% ===========================================
    subgraph "AI Processing Layer"
        B1["📸 Image Capture<br/>• Camera API<br/>• File Upload<br/>• Image Validation"]
        B2["🖼️ Image Processing<br/>• Format Conversion<br/>• Base64 Encoding<br/>• Metadata Extraction"]
        
        subgraph "Groq AI Models"
            C1["🤖 Vision Model<br/>llama-3.2-90b-vision<br/>• Image Analysis<br/>• Text Detection<br/>• Layout Recognition"]
            C2["🧠 Text Processor<br/>llama3-8b-8192<br/>• Text Cleaning<br/>• Format Standardization<br/>• Noise Removal"]
            C3["⚙️ Structure Extractor<br/>llama3-groq-70b-8192<br/>• JSON Schema<br/>• Data Validation<br/>• Category Assignment"]
        end
        
        B3["✅ OCR Validation<br/>• Confidence Scoring<br/>• Error Detection<br/>• Quality Assessment"]
    end

    %% ===========================================
    %% API & BACKEND LAYER
    %% ===========================================
    subgraph "Backend API Layer (Next.js API Routes)"
        D1["🔗 OCR API Endpoint<br/>/api/ocr<br/>• Image Processing<br/>• AI Orchestration<br/>• Error Handling"]
        D2["📊 Menu API<br/>/api/menu<br/>• CRUD Operations<br/>• Category Management<br/>• Item Validation"]
        D3["🍽️ Order API<br/>/api/orders<br/>• Order Creation<br/>• Status Management<br/>• Item Tracking"]
        D4["💳 Payment API<br/>/api/payments<br/>• Transaction Processing<br/>• Method Validation<br/>• Receipt Generation"]
        D5["📦 Inventory API<br/>/api/inventory<br/>• Stock Management<br/>• Usage Tracking<br/>• Alert System"]
    end

    %% ===========================================
    %% DATABASE LAYER
    %% ===========================================
    subgraph "Database Layer (Supabase PostgreSQL)"
        E1[("🗃️ Menu Tables<br/>• menu_categories<br/>• menu_items<br/>• menu_item_ingredients")]
        E2[("🍽️ Order Tables<br/>• orders<br/>• order_items<br/>• tables")]
        E3[("💰 Payment Tables<br/>• payments<br/>• transactions<br/>• receipts")]
        E4[("📦 Inventory Tables<br/>• inventory_items<br/>• inventory_transactions<br/>• stock_alerts")]
        E5[("🔄 Real-time Engine<br/>• PostgreSQL Changes<br/>• WebSocket Connections<br/>• Live Subscriptions")]
    end

    %% ===========================================
    %% EXTERNAL SERVICES
    %% ===========================================
    subgraph "External Services"
        F1["🌐 Groq API<br/>• Model Access<br/>• Rate Limiting<br/>• Authentication"]
        F2["☁️ Supabase Cloud<br/>• Database Hosting<br/>• Real-time Features<br/>• Authentication"]
        F3["💾 Local Storage<br/>• Image Caching<br/>• Session Data<br/>• Offline Support"]
    end

    %% ===========================================
    %% DETAILED OCR WORKFLOW
    %% ===========================================
    A1 -->|"1. Click Camera Recognition"| B1
    B1 -->|"2. Capture/Upload Image"| B2
    B2 -->|"3. Convert to Base64"| D1
    D1 -->|"4. Send to Vision Model"| C1
    C1 -->|"5. Extract Raw Text"| C2
    C2 -->|"6. Clean & Format Text"| C3
    C3 -->|"7. Structure as JSON"| B3
    B3 -->|"8. Validate & Score"| D1
    D1 -->|"9. Process Categories"| D2
    D2 -->|"10. Create Categories"| E1
    D2 -->|"11. Save Menu Items"| E1
    E1 -->|"12. Success Response"| A1

    %% ===========================================
    %% REAL-TIME ORDER WORKFLOW
    %% ===========================================
    A3 -->|"Take Order"| D3
    D3 -->|"Create Order Record"| E2
    E2 -->|"Real-time Update"| E5
    E5 -->|"Live Notification"| A2
    A2 -->|"Update Status"| D3
    D3 -->|"Status Change"| E2
    E2 -->|"Notify Waiter"| A3
    A3 -->|"Send to Billing"| A4

    %% ===========================================
    %% BILLING & INVENTORY WORKFLOW
    %% ===========================================
    A4 -->|"Process Payment"| D4
    D4 -->|"Create Payment"| E3
    D4 -->|"Trigger Inventory"| D5
    D5 -->|"Deduct Ingredients"| E4
    E4 -->|"Update Stock Levels"| E5
    E5 -->|"Stock Alerts"| A1

    %% ===========================================
    %% EXTERNAL API CONNECTIONS
    %% ===========================================
    D1 -.->|"API Calls"| F1
    E1 -.->|"Database Operations"| F2
    E2 -.->|"Real-time Sync"| F2
    E3 -.->|"Transaction Storage"| F2
    E4 -.->|"Inventory Sync"| F2
    E5 -.->|"Live Updates"| F2
    B2 -.->|"Image Storage"| F3
    A5 -.->|"Cache Management"| F3

    %% ===========================================
    %% MOBILE RESPONSIVE CONNECTIONS
    %% ===========================================
    A5 -.->|"Mobile Admin"| A1
    A5 -.->|"Mobile Kitchen"| A2
    A5 -.->|"Mobile Waiter"| A3
    A5 -.->|"Mobile Billing"| A4

    %% ===========================================
    %% STYLING FOR VISUAL CLARITY
    %% ===========================================
    classDef frontend fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef ai fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef backend fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef database fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef external fill:#fce4ec,stroke:#880e4f,stroke-width:2px

    class A1,A2,A3,A4,A5 frontend
    class B1,B2,B3,C1,C2,C3 ai
    class D1,D2,D3,D4,D5 backend
    class E1,E2,E3,E4,E5 database
    class F1,F2,F3 external
```

## 🛠️ Installation

### Prerequisites
- Node.js 18+ and npm/pnpm
- Supabase account and project
- Groq API key

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Margroms/margros-pos-system.git
   cd margros-pos-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Environment Variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GROQ_API_KEY=your_groq_api_key
   ```

4. **Database Setup**
   Set up your Supabase database with the required tables:
   - `menu_categories`
   - `menu_items`
   - `tables`
   - `orders`
   - `order_items`
   - `payments`
   - `inventory_items`
   - `inventory_transactions`

5. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

6. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Usage

### Dashboard Navigation
- **Admin Panel**: Menu management and system settings
- **Waiter Station**: Table and order management
- **Kitchen Display**: Order preparation queue
- **Billing Counter**: Payment processing
- **Inventory Control**: Stock management

### OCR Menu Recognition
1. Navigate to Admin → Menu Management
2. Click "Camera Recognition" button
3. Capture or upload menu photo
4. Review extracted items
5. Upload to database

### Order Workflow
1. **Waiter**: Select table and add items
2. **Kitchen**: View and prepare orders
3. **Waiter**: Mark orders as served
4. **Billing**: Process payment and close table

## 🔧 Configuration

### Groq Models Used
- **Vision**: `llama-3.2-90b-vision-preview` - Image analysis
- **Text Cleaning**: `llama3-8b-8192` - Text processing
- **Extraction**: `llama3-groq-70b-8192-tool-use-preview` - Structured data

### Database Schema
The system uses PostgreSQL through Supabase with real-time subscriptions for live updates across all connected devices.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Open an issue on GitHub
- Contact the development team
- Check the documentation

## 🚀 Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Integration with popular payment gateways
- [ ] Voice ordering capabilities
- [ ] AI-powered sales insights

---

Built with ❤️ by the Margros team
