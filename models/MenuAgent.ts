
import { getGroqCompletion } from "./AIAgent";

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category_id: number;
  description: string;
  image_url?: string;
  is_available: boolean;
}

interface MenuCategory {
  id: number;
  name: string;
  display_order: number;
}

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  category_id: number;
}

interface OrderItem {
  id: number;
  menu_item_id: number;
  quantity: number;
  price: number;
  menu_items?: MenuItem;
}

interface MenuAnalysisData {
  menuItems: MenuItem[];
  menuCategories: MenuCategory[];
  inventoryItems?: InventoryItem[];
  orderItems?: OrderItem[];
  salesData?: any[];
  timeRange?: string;
  customerFeedback?: any[];
  seasonalContext?: string;
  competitorData?: any[];
}

export async function getMenuSuggestions(prompt: string) {
  const fullPrompt = `The user is asking for menu suggestions. Here is their query: "${prompt}". Provide a list of new menu items with descriptions.`;
  return await getGroqCompletion(fullPrompt);
}

export async function getComprehensiveMenuAnalysis(data: MenuAnalysisData) {
  const currentDate = new Date();
  const currentSeason = getCurrentSeason();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  
  // Calculate menu performance metrics
  const totalItems = data.menuItems.length;
  const availableItems = data.menuItems.filter(item => item.is_available).length;
  const averagePrice = data.menuItems.reduce((sum, item) => sum + item.price, 0) / totalItems;
  
  // Category breakdown
  const categoryBreakdown = data.menuCategories.map(category => {
    const categoryItems = data.menuItems.filter(item => item.category_id === category.id);
    const avgPrice = categoryItems.length > 0 ? 
      categoryItems.reduce((sum, item) => sum + item.price, 0) / categoryItems.length : 0;
    const availability = categoryItems.filter(item => item.is_available).length;
    
    return {
      name: category.name,
      items: categoryItems.length,
      avgPrice: avgPrice,
      available: availability,
      displayOrder: category.display_order
    };
  });

  // Sales performance if available
  const salesPerformance = data.orderItems ? 
    data.orderItems.reduce((acc, item) => {
      const itemName = item.menu_items?.name || 'Unknown';
      if (!acc[itemName]) {
        acc[itemName] = { quantity: 0, revenue: 0 };
      }
      acc[itemName].quantity += item.quantity;
      acc[itemName].revenue += item.price * item.quantity;
      return acc;
    }, {} as Record<string, { quantity: number; revenue: number }>) : {};

  const topSellers = Object.entries(salesPerformance)
    .sort(([,a], [,b]) => b.revenue - a.revenue)
    .slice(0, 10);

  const underperformers = Object.entries(salesPerformance)
    .sort(([,a], [,b]) => a.quantity - b.quantity)
    .slice(0, 5);

  const prompt = `
**MENU MANAGEMENT AGENT - COMPREHENSIVE CULINARY ANALYSIS**

You are the Head Chef and Menu Strategy AI for a restaurant. Analyze the complete menu ecosystem and provide strategic insights.

**CURRENT MENU STATUS:**
- Total Menu Items: ${totalItems}
- Available Items: ${availableItems} (${((availableItems/totalItems)*100).toFixed(1)}% availability)
- Average Menu Price: ₹${averagePrice.toFixed(2)}
- Current Season: ${currentSeason}
- Current Month: ${currentMonth}

**CATEGORY PERFORMANCE:**
${categoryBreakdown.map(cat => 
  `- ${cat.name}: ${cat.items} items, ₹${cat.avgPrice.toFixed(2)} avg price, ${cat.available}/${cat.items} available`
).join('\n')}

**TOP PERFORMING ITEMS:**
${topSellers.slice(0, 5).map(([name, stats]) => 
  `- ${name}: ${stats.quantity} orders, ₹${stats.revenue.toFixed(2)} revenue`
).join('\n')}

**UNDERPERFORMING ITEMS:**
${underperformers.map(([name, stats]) => 
  `- ${name}: Only ${stats.quantity} orders, ₹${stats.revenue.toFixed(2)} revenue`
).join('\n')}

**INVENTORY INTEGRATION:**
${data.inventoryItems ? `Available Ingredients: ${data.inventoryItems.length} items` : 'No inventory data available'}

Provide a comprehensive menu strategy analysis including:

**1. MENU OPTIMIZATION STRATEGIES**
- Items to promote for higher sales
- Underperforming items to revise or remove
- Price optimization opportunities
- Category balance recommendations

**2. SEASONAL MENU INNOVATIONS (${currentSeason} Focus)**
- New seasonal dishes to introduce
- Traditional ${currentSeason} specialties
- Seasonal ingredient utilization
- Weather-appropriate comfort foods

**3. INGREDIENT-DRIVEN MENU DEVELOPMENT**
- New dishes based on available inventory
- Cross-utilization of expensive ingredients
- Zero-waste cooking implementations
- Cost-effective ingredient combinations

**4. CUSTOMER EXPERIENCE ENHANCEMENT**
- Menu flow and ordering psychology
- Dietary restriction accommodations
- Portion size optimization
- Presentation and plating suggestions

**5. PROFITABILITY ANALYSIS**
- High-margin items to promote
- Cost reduction opportunities
- Upselling and cross-selling strategies
- Bundle and combo meal suggestions

**6. COMPETITIVE POSITIONING**
- Unique dishes that differentiate from competitors
- Trending food concepts to incorporate
- Regional specialties to highlight
- Instagram-worthy presentation ideas

**7. NUTRITIONAL & DIETARY CONSIDERATIONS**
- Healthy options integration
- Vegan and vegetarian variety
- Gluten-free and allergen-free options
- Calorie-conscious alternatives

**8. OPERATIONAL EFFICIENCY**
- Kitchen workflow optimization
- Prep time reduction strategies
- Equipment utilization maximization
- Staff skill development recommendations

**9. MARKETING & PROMOTION STRATEGIES**
- Daily special recommendations
- Festival and occasion menus
- Limited-time offers (LTO) concepts
- Social media-friendly dishes

**10. FUTURE MENU ROADMAP**
- Quarterly menu refresh strategies
- Seasonal rotation planning
- New category introduction timeline
- Innovation pipeline development

**11. REGIONAL & CULTURAL INTEGRATION**
- Local taste preferences accommodation
- Regional festival special menus
- Traditional recipe modernization
- Fusion cuisine opportunities

**12. SUSTAINABILITY & ETHICS**
- Local sourcing integration
- Sustainable ingredient choices
- Waste reduction through menu design
- Ethical sourcing considerations

Provide specific dish suggestions, pricing strategies, and implementation timelines. Include Indian cuisine expertise with both traditional and contemporary approaches.
`;

  return await getGroqCompletion(prompt);
}

export async function getSeasonalMenuRecommendations() {
  const currentSeason = getCurrentSeason();
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  
  const prompt = `
**SEASONAL CULINARY SPECIALIST - ${currentSeason.toUpperCase()} MENU INNOVATIONS**

You are a Master Chef specializing in seasonal Indian cuisine. Create comprehensive seasonal menu recommendations for ${currentMonth} (${currentSeason}).

**SEASONAL MENU DEVELOPMENT REQUIRED:**

**1. TRADITIONAL SEASONAL SPECIALTIES**
- Classic ${currentSeason} dishes from different Indian regions
- Festival and celebration foods for this time of year
- Traditional home-style comfort foods
- Regional seasonal delicacies

**2. MODERN FUSION INNOVATIONS**
- Contemporary twists on traditional seasonal dishes
- International fusion with seasonal Indian ingredients
- Health-conscious modern interpretations
- Instagram-worthy presentation ideas

**3. SEASONAL INGREDIENT SHOWCASES**
- Feature dishes highlighting peak season produce
- Creative uses for abundant seasonal ingredients
- Preservation techniques (pickles, chutneys, preserves)
- Zero-waste seasonal cooking concepts

**4. WEATHER-APPROPRIATE OFFERINGS**
- Hot/cold beverages perfect for current weather
- Comfort foods suited to the temperature
- Cooling/warming spices and preparations
- Hydrating/nourishing seasonal options

**5. FESTIVAL & OCCASION MENUS**
- Upcoming festivals and their traditional foods
- Celebration platters and special occasion meals
- Gift-worthy food items and packages
- Community gathering menu suggestions

**6. BEVERAGE PROGRAM**
- Seasonal fresh juices and smoothies
- Traditional drinks and sherbet varieties
- Hot/cold beverage innovations
- Mocktails using seasonal fruits and herbs

**7. HEALTHY & WELLNESS FOCUS**
- Seasonal detox and cleansing foods
- Immunity-boosting ingredient combinations
- Ayurvedic seasonal eating principles
- Superfood integration with traditional recipes

**8. STREET FOOD & CASUAL DINING**
- Seasonal street food interpretations
- Casual snacks perfect for the weather
- Tea-time accompaniments
- Quick bite seasonal options

**9. PREMIUM & SPECIALTY OFFERINGS**
- Luxury seasonal ingredients and preparations
- Chef's special seasonal tasting menus
- Premium seasonal gift items
- Artisanal seasonal preserves and products

**10. COST-EFFECTIVE SEASONAL OPTIONS**
- Budget-friendly seasonal dishes
- Student and family meal options
- Value meal combinations using seasonal produce
- Bulk cooking for seasonal abundance

**11. REGIONAL SPECIALTIES**
- North Indian seasonal favorites
- South Indian seasonal traditions
- Eastern and Western Indian seasonal dishes
- Tribal and rural seasonal preparations

**12. DIETARY SPECIFIC OPTIONS**
- Vegan seasonal specialties
- Gluten-free seasonal dishes
- Diabetic-friendly seasonal options
- Weight-conscious seasonal meals

For each recommendation, provide:
- Detailed recipe concepts
- Key seasonal ingredients required
- Estimated cost per serving
- Preparation complexity level
- Expected customer appeal
- Profit margin potential
- Presentation and serving suggestions

Include both traditional authenticity and modern innovation approaches.
`;

  return await getGroqCompletion(prompt);
}

export async function getMenuEngineeringAnalysis(data: MenuAnalysisData) {
  const salesData = data.orderItems || [];
  const totalRevenue = salesData.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalQuantity = salesData.reduce((sum, item) => sum + item.quantity, 0);
  
  const prompt = `
**MENU ENGINEERING SPECIALIST - SCIENTIFIC PROFITABILITY ANALYSIS**

You are a Menu Engineering expert specializing in data-driven menu optimization. Analyze menu performance using scientific methods.

**MENU PERFORMANCE METRICS:**
- Total Menu Items: ${data.menuItems.length}
- Total Revenue: ₹${totalRevenue.toFixed(2)}
- Total Items Sold: ${totalQuantity}
- Average Order Value: ₹${totalQuantity > 0 ? (totalRevenue/totalQuantity).toFixed(2) : '0'}

**DETAILED MENU ANALYSIS:**

**1. MENU MIX ANALYSIS (Star Classification)**
Classify each menu item into four categories:
- **STARS** (High Profitability + High Popularity)
- **PLOWHORSES** (Low Profitability + High Popularity) 
- **PUZZLES** (High Profitability + Low Popularity)
- **DOGS** (Low Profitability + Low Popularity)

**2. CONTRIBUTION MARGIN ANALYSIS**
- Calculate contribution margin for each item
- Identify highest and lowest margin items
- Weighted average contribution margin
- Impact of sales mix on overall profitability

**3. MENU PSYCHOLOGY & DESIGN**
- Optimal menu layout and item positioning
- Price anchoring strategies
- Description psychology and word choice
- Visual hierarchy and customer eye-tracking

**4. PRICE ELASTICITY ANALYSIS**
- Items suitable for price increases
- Items requiring price reduction or bundling
- Sweet spot pricing for maximum revenue
- Competitor pricing comparison strategies

**5. CROSS-SELLING & UPSELLING OPPORTUNITIES**
- Natural item pairings and combinations
- Appetizer-to-main course flow optimization
- Beverage pairing recommendations
- Dessert attachment strategies

**6. KITCHEN EFFICIENCY OPTIMIZATION**
- Items with complex preparation vs. simple execution
- Equipment utilization analysis
- Labor cost per item consideration
- Prep time vs. profitability balance

**7. INVENTORY TURNOVER IMPACT**
- Items driving highest inventory turnover
- Slow-moving inventory items to promote
- Ingredient utilization optimization
- Waste reduction through menu engineering

**8. CUSTOMER JOURNEY OPTIMIZATION**
- First-time visitor attraction items
- Repeat customer retention dishes
- Special occasion and celebration options
- Takeaway vs. dine-in suitability

**9. SEASONAL PERFORMANCE PATTERNS**
- Items with seasonal popularity fluctuations
- Year-round consistent performers
- Holiday and festival impact analysis
- Weather-dependent item performance

**10. COMPETITIVE ADVANTAGE ANALYSIS**
- Unique items that differentiate from competitors
- Price positioning vs. market standards
- Value perception vs. actual costs
- Brand identity reinforcement through menu

**11. DIGITAL MENU OPTIMIZATION**
- Online ordering platform performance
- Food delivery app optimization
- Photography and description effectiveness
- Search and filter optimization

**12. PROFITABILITY IMPROVEMENT ROADMAP**
- Immediate actions for profit improvement
- Medium-term menu restructuring plans
- Long-term strategic menu evolution
- Performance monitoring and adjustment protocols

Provide specific recommendations with:
- Exact profit margin calculations
- Implementation timelines
- Expected revenue impact
- Risk assessment for each change
- A/B testing strategies for menu modifications

Use Indian restaurant context with local cost structures and customer preferences.
`;

  return await getGroqCompletion(prompt);
}

export async function getAutoMenuCreation(availableIngredients: InventoryItem[], targetCategory: string, priceRange: string) {
  const ingredientsList = availableIngredients.map(item => 
    `${item.name} (${item.quantity}${item.unit} available, ₹${item.price}/${item.unit})`
  ).join('\n');
  
  const prompt = `
**AUTOMATIC MENU CREATION ENGINE - INGREDIENT-DRIVEN DISH DEVELOPMENT**

You are an innovative chef AI specializing in creating new dishes from available ingredients. Design original menu items using current inventory.

**AVAILABLE INGREDIENTS:**
${ingredientsList}

**CREATION PARAMETERS:**
- Target Category: ${targetCategory}
- Price Range: ${priceRange}
- Required: Use maximum available ingredients efficiently

**MENU CREATION REQUIREMENTS:**

**1. INNOVATIVE DISH CONCEPTS**
- 5-10 completely new dish ideas
- Creative combinations of available ingredients
- Both traditional and fusion approaches
- Unique selling propositions for each dish

**2. DETAILED RECIPE DEVELOPMENT**
- Exact ingredient quantities per serving
- Step-by-step cooking instructions
- Cooking time and difficulty level
- Equipment requirements

**3. COST ANALYSIS & PRICING**
- Ingredient cost per serving calculation
- Suggested selling price for target profit margin
- Portion size recommendations
- Cost optimization suggestions

**4. NUTRITIONAL & DIETARY INFORMATION**
- Caloric content estimation
- Macronutrient breakdown
- Allergen information
- Dietary classifications (veg/non-veg/vegan/gluten-free)

**5. PRESENTATION & PLATING**
- Plating style and presentation ideas
- Garnishing recommendations
- Serving vessel suggestions
- Photography tips for marketing

**6. INGREDIENT UTILIZATION OPTIMIZATION**
- Cross-utilization across multiple dishes
- Waste minimization strategies
- Leftover ingredient creative uses
- Prep efficiency maximization

**7. SCALABILITY ANALYSIS**
- Batch cooking feasibility
- Kitchen equipment requirements at scale
- Staff skill level requirements
- Quality consistency maintenance

**8. MARKET POSITIONING**
- Target customer demographic
- Competitor differentiation points
- Unique value proposition
- Marketing angle suggestions

**9. SEASONAL & OCCASION SUITABILITY**
- Best time to feature each dish
- Special occasion applicability
- Weather appropriateness
- Festival and celebration integration

**10. CUSTOMER EXPERIENCE FACTORS**
- Eating experience and satisfaction level
- Shareability and social media potential
- Comfort food vs. adventure factor
- Repeat order probability

**11. OPERATIONAL CONSIDERATIONS**
- Kitchen workflow integration
- Prep time requirements
- Shelf life and holding capacity
- Staff training requirements

**12. VARIATION & CUSTOMIZATION OPTIONS**
- Spice level variations
- Dietary restriction modifications
- Size and portion options
- Add-on and customization possibilities

For each dish concept, provide:
- Creative and appetizing name
- Compelling menu description (2-3 lines)
- Detailed ingredient list with quantities
- Cooking method summary
- Cost breakdown and suggested price
- Expected popularity and profit potential

Focus on Indian cuisine expertise while encouraging creative innovation and fusion possibilities.
`;

  return await getGroqCompletion(prompt);
}

export async function getCompetitiveMenuAnalysis(competitorData: any[], currentMenu: MenuItem[]) {
  const prompt = `
**COMPETITIVE INTELLIGENCE SPECIALIST - MENU POSITIONING ANALYSIS**

You are a Restaurant Intelligence Analyst specializing in competitive menu analysis and market positioning.

**CURRENT MENU OVERVIEW:**
${currentMenu.map(item => `- ${item.name}: ₹${item.price} (${item.is_available ? 'Available' : 'Unavailable'})`).join('\n')}

**COMPETITIVE ANALYSIS REQUIRED:**

**1. COMPETITIVE PRICING ANALYSIS**
- Price positioning vs. competitors
- Value perception optimization
- Pricing gap identification
- Premium vs. value positioning strategy

**2. MENU GAP ANALYSIS**
- Missing categories or dishes
- Underserved customer segments
- Trending items competitors offer
- Innovation opportunities

**3. DIFFERENTIATION STRATEGIES**
- Unique items to develop
- Better execution of common dishes
- Signature dish development
- Brand positioning through menu

**4. MARKET TREND INTEGRATION**
- Current food trends to adopt
- Emerging cuisine styles
- Health and wellness trends
- Technology integration opportunities

**5. CUSTOMER ACQUISITION STRATEGIES**
- Competitor customer attraction tactics
- Switching incentive creation
- Trial generation strategies
- Loyalty building through menu

**6. OPERATIONAL EFFICIENCY COMPARISON**
- Simpler preparation methods
- Faster service optimization
- Kitchen efficiency improvements
- Cost structure optimization

Provide specific, actionable recommendations for competitive advantage through menu strategy.
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
