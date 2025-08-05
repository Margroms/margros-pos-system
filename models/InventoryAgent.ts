
import { getGroqCompletion } from "./AIAgent";

interface InventoryItem {
  id: number;
  name: string;
  category_id: number;
  quantity: number;
  unit: string;
  restock_threshold: number;
  price: number;
  expiry_date?: string;
  last_restocked?: string;
  inventory_categories?: {
    name: string;
  };
}

interface MenuItem {
  id: number;
  name: string;
  category_id: number;
  description: string;
  price: number;
  is_available: boolean;
}

interface InventoryAnalysisData {
  inventoryItems: InventoryItem[];
  menuItems?: MenuItem[];
  timeRange?: string;
  salesData?: any[];
  seasonalContext?: string;
  restaurantType?: string;
}

export async function getInventorySuggestions(prompt: string) {
  const fullPrompt = `The user is asking for inventory suggestions. Here is their query: "${prompt}". Provide a list of items that are low in stock and should be reordered.`;
  return await getGroqCompletion(fullPrompt);
}

export async function getComprehensiveInventoryInsights(data: InventoryAnalysisData) {
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentSeason = getCurrentSeason();
  
  const lowStockItems = data.inventoryItems.filter(item => 
    item.quantity <= item.restock_threshold
  );
  
  const expiringItems = data.inventoryItems.filter(item => {
    if (!item.expiry_date) return false;
    const expiry = new Date(item.expiry_date);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  });

  const expiredItems = data.inventoryItems.filter(item => {
    if (!item.expiry_date) return false;
    const expiry = new Date(item.expiry_date);
    return expiry < currentDate;
  });

  const totalInventoryValue = data.inventoryItems.reduce((sum, item) => 
    sum + (item.quantity * item.price), 0
  );

  const categoryBreakdown = data.inventoryItems.reduce((acc, item) => {
    const category = item.inventory_categories?.name || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = { items: 0, value: 0, lowStock: 0 };
    }
    acc[category].items += 1;
    acc[category].value += item.quantity * item.price;
    if (item.quantity <= item.restock_threshold) {
      acc[category].lowStock += 1;
    }
    return acc;
  }, {} as Record<string, { items: number; value: number; lowStock: number }>);

  const prompt = `
**INVENTORY MANAGEMENT AGENT - COMPREHENSIVE ANALYSIS**

You are the Chief Inventory Manager AI for a restaurant. Analyze the current inventory data and provide comprehensive insights.

**CURRENT INVENTORY STATUS:**
- Total Items: ${data.inventoryItems.length}
- Total Inventory Value: ₹${totalInventoryValue.toFixed(2)}
- Low Stock Items: ${lowStockItems.length}
- Expiring Soon (7 days): ${expiringItems.length}
- Expired Items: ${expiredItems.length}
- Current Season: ${currentSeason}
- Current Month: ${currentMonth}

**CATEGORY BREAKDOWN:**
${Object.entries(categoryBreakdown).map(([category, stats]) => 
  `- ${category}: ${stats.items} items, ₹${stats.value.toFixed(2)} value, ${stats.lowStock} low stock`
).join('\n')}

**LOW STOCK ALERT (Critical Priority):**
${lowStockItems.map(item => 
  `- ${item.name}: ${item.quantity}${item.unit} (Threshold: ${item.restock_threshold}${item.unit})`
).join('\n')}

**EXPIRING ITEMS (Immediate Action Required):**
${expiringItems.map(item => {
  const daysLeft = Math.ceil((new Date(item.expiry_date!).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
  return `- ${item.name}: Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (${item.expiry_date})`;
}).join('\n')}

**EXPIRED ITEMS (Immediate Removal Required):**
${expiredItems.map(item => 
  `- ${item.name}: EXPIRED on ${item.expiry_date} - REMOVE IMMEDIATELY`
).join('\n')}

**MENU ITEMS CONTEXT:**
${data.menuItems ? data.menuItems.map(item => 
  `- ${item.name} (${item.is_available ? 'Available' : 'Unavailable'})`
).join('\n') : 'No menu data available'}

Provide a comprehensive analysis including:

**1. CRITICAL ALERTS & IMMEDIATE ACTIONS**
- Emergency reorder requirements
- Food safety concerns
- Items affecting menu availability

**2. INVENTORY OPTIMIZATION STRATEGIES**
- Reorder recommendations with specific quantities
- Supplier suggestions and timing
- Cost optimization opportunities

**3. SEASONAL RECOMMENDATIONS (${currentSeason} Focus)**
- Seasonal ingredients to stock up on
- Items to reduce for off-season
- Special occasion preparation (festivals, holidays)

**4. MENU INTEGRATION INSIGHTS**
- Ingredients needed for popular dishes
- Suggestions for new seasonal menu items
- Items that can be cross-utilized across dishes

**5. FINANCIAL OPTIMIZATION**
- Cost-saving opportunities
- Waste reduction strategies
- ROI improvement suggestions

**6. PREDICTIVE PLANNING**
- Weekly reorder schedule
- Monthly inventory goals
- Seasonal transition planning

**7. QUALITY & FRESHNESS MANAGEMENT**
- FIFO (First In, First Out) recommendations
- Storage optimization tips
- Shelf-life extension strategies

**8. SUPPLIER & PROCUREMENT INSIGHTS**
- Best time to negotiate with suppliers
- Bulk purchase opportunities
- Alternative supplier recommendations

Provide specific, actionable insights with exact quantities, dates, and financial impact where possible. Include Indian restaurant context and local sourcing opportunities.
`;

  return await getGroqCompletion(prompt);
}

export async function getSeasonalInventoryRecommendations() {
  const currentSeason = getCurrentSeason();
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  
  const prompt = `
**SEASONAL INVENTORY SPECIALIST - ${currentSeason.toUpperCase()} RECOMMENDATIONS**

You are a Seasonal Inventory Specialist for an Indian restaurant. Provide comprehensive seasonal recommendations for ${currentMonth} (${currentSeason}).

**ANALYSIS REQUIRED:**

**1. SEASONAL INGREDIENTS TO STOCK UP**
- Fresh seasonal vegetables and fruits
- Seasonal spices and herbs
- Special occasion ingredients
- Regional specialties for this season

**2. TRADITIONAL SEASONAL DISHES**
- Popular ${currentSeason} dishes that require specific ingredients
- Festival and celebration foods for this time of year
- Comfort foods appropriate for current weather

**3. SUPPLY CHAIN CONSIDERATIONS**
- Ingredients that might face price fluctuations
- Items with limited seasonal availability
- Best time to purchase seasonal items in bulk

**4. MENU ADAPTATION SUGGESTIONS**
- Seasonal menu additions that would be popular
- Items to temporarily remove from menu
- Special seasonal promotions and combos

**5. STORAGE & PRESERVATION TIPS**
- Season-appropriate storage methods
- Items requiring special handling in current weather
- Preservation techniques for seasonal abundance

**6. COST OPTIMIZATION**
- Cheapest and best quality seasonal produce
- Items to buy in bulk during peak season
- Alternative ingredients when primary ones are expensive

**7. REGIONAL & LOCAL SOURCING**
- Local farmers and suppliers for seasonal items
- Regional specialties to incorporate
- Community-supported agriculture opportunities

**8. CUSTOMER PREFERENCES**
- Popular drinks and beverages for this season
- Comfort foods customers crave
- Health-conscious options for the season

Provide specific item names, quantities, timing, and expected costs in Indian Rupees. Include both North and South Indian cuisine considerations.
`;

  return await getGroqCompletion(prompt);
}

export async function getInventoryOptimizationPlan(data: InventoryAnalysisData) {
  const totalValue = data.inventoryItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const averageItemValue = totalValue / data.inventoryItems.length;
  
  const prompt = `
**INVENTORY OPTIMIZATION SPECIALIST - COMPREHENSIVE EFFICIENCY PLAN**

You are an Inventory Optimization Specialist. Create a detailed plan to maximize efficiency and minimize waste.

**CURRENT INVENTORY METRICS:**
- Total Inventory Value: ₹${totalValue.toFixed(2)}
- Total Items: ${data.inventoryItems.length}
- Average Item Value: ₹${averageItemValue.toFixed(2)}

**DETAILED INVENTORY BREAKDOWN:**
${data.inventoryItems.map(item => {
  const daysOfStock = item.restock_threshold > 0 ? Math.floor(item.quantity / item.restock_threshold * 7) : 0;
  const status = item.quantity <= item.restock_threshold * 0.5 ? 'CRITICAL' : 
                item.quantity <= item.restock_threshold ? 'LOW' : 'OK';
  return `- ${item.name}: ${item.quantity}${item.unit} (${status}) - ₹${(item.quantity * item.price).toFixed(2)} - ~${daysOfStock} days stock`;
}).join('\n')}

**OPTIMIZATION ANALYSIS REQUIRED:**

**1. ABC ANALYSIS (Value-based Classification)**
- A-Category (High Value): Items contributing to 80% of inventory value
- B-Category (Medium Value): Items contributing to 15% of inventory value  
- C-Category (Low Value): Items contributing to 5% of inventory value
- Specific management strategies for each category

**2. DEMAND FORECASTING**
- Historical consumption patterns analysis
- Seasonal demand variations
- Menu popularity impact on ingredient usage
- Special event and festival requirements

**3. REORDER POINT OPTIMIZATION**
- Optimal reorder levels for each item
- Safety stock recommendations
- Lead time considerations
- Supplier reliability factors

**4. ECONOMIC ORDER QUANTITY (EOQ)**
- Optimal order quantities to minimize total cost
- Bulk purchase vs. frequent small orders analysis
- Storage cost vs. ordering cost optimization
- Cash flow impact assessment

**5. WASTE REDUCTION STRATEGIES**
- Items with high spoilage rates
- Cross-utilization opportunities across menu items
- Creative uses for near-expiry items
- Staff training recommendations for waste prevention

**6. STORAGE & HANDLING OPTIMIZATION**
- Optimal storage conditions for each category
- FIFO implementation strategies
- Temperature and humidity control requirements
- Pest control and quality maintenance

**7. SUPPLIER RELATIONSHIP OPTIMIZATION**
- Primary vs. secondary supplier strategies
- Negotiation opportunities and timing
- Local vs. national supplier cost-benefit analysis
- Quality vs. cost trade-offs

**8. TECHNOLOGY INTEGRATION**
- Inventory tracking system recommendations
- Automated reorder point alerts
- Integration with POS and menu planning
- Real-time inventory visibility solutions

**9. FINANCIAL OPTIMIZATION**
- Cash flow improvement strategies
- Inventory turnover rate optimization
- Cost reduction opportunities without quality compromise
- ROI improvement metrics and targets

**10. CONTINGENCY PLANNING**
- Emergency supplier alternatives
- Supply chain disruption management
- Price volatility hedging strategies
- Quality issue response protocols

Provide specific calculations, timelines, and expected cost savings for each recommendation.
`;

  return await getGroqCompletion(prompt);
}

export async function getAutoIngredientSuggestions(menuItemName: string, menuDescription: string) {
  const prompt = `
**INGREDIENT INTELLIGENCE SYSTEM - AUTO-SUGGESTION ENGINE**

You are an expert chef and ingredient specialist. Analyze the menu item and provide comprehensive ingredient requirements.

**MENU ITEM TO ANALYZE:**
- Name: ${menuItemName}
- Description: ${menuDescription}

**REQUIRED ANALYSIS:**

**1. PRIMARY INGREDIENTS**
- Main proteins, vegetables, or base ingredients
- Exact quantities needed per serving
- Quality grades and specifications
- Alternative options for dietary restrictions

**2. SPICES & SEASONINGS**
- Essential spices with exact measurements
- Fresh herbs and aromatics
- Salt, pepper, and basic seasonings
- Regional variations and alternatives

**3. COOKING ESSENTIALS**
- Oils, ghee, butter for cooking
- Vinegars, acids, and flavor enhancers
- Binding agents (flour, cornstarch, etc.)
- Liquid ingredients (stocks, milks, etc.)

**4. GARNISHES & PRESENTATION**
- Fresh garnish ingredients
- Decorative elements
- Accompaniments and sides
- Serving essentials

**5. PREPARATION REQUIREMENTS**
- Marination ingredients and time
- Pre-cooking preparation needs
- Special equipment or tools required
- Temperature and cooking method specifications

**6. NUTRITIONAL CONSIDERATIONS**
- Caloric content estimation
- Major allergens present
- Dietary classification (veg/non-veg/vegan)
- Nutritional benefits and considerations

**7. COST ANALYSIS**
- Estimated ingredient cost per serving
- High-cost ingredients that drive price
- Cost optimization suggestions
- Portion control recommendations

**8. STORAGE & SHELF LIFE**
- Ingredient storage requirements
- Perishability timeline for each ingredient
- Optimal purchase quantities
- Cross-utilization with other menu items

**9. SUPPLIER RECOMMENDATIONS**
- Best suppliers for specialty ingredients
- Local vs. imported ingredient options
- Seasonal availability and pricing
- Quality standards and certifications

**10. RECIPE SCALING**
- Ingredients needed for 10, 50, 100 servings
- Batch cooking considerations
- Equipment capacity requirements
- Quality maintenance at scale

Format the response with specific quantities, units, and estimated costs in Indian Rupees. Include both traditional and modern preparation methods.
`;

  return await getGroqCompletion(prompt);
}

function getCurrentSeason(): string {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Autumn';
  return 'Winter';
}
