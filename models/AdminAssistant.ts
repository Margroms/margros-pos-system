import { getGroqCompletion } from "./AIAgent";

interface AdminDashboardData {
  orders: any[];
  payments: any[];
  orderItems: any[];
  menuItems: any[];
  menuCategories: any[];
  inventoryItems?: any[];
  tableData?: any[];
  staffData?: any[];
  customerData?: any[];
  financialData?: any[];
  timeRange?: string;
  businessMetrics?: any;
}

interface BusinessMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageBill: number;
  profitMargin?: number;
  operatingCosts?: number;
  staffCosts?: number;
  inventoryCosts?: number;
}

interface OperationalData {
  tableUtilization: number;
  kitchenEfficiency: number;
  serviceTime: number;
  customerSatisfaction: number;
  staffProductivity: number;
  inventoryTurnover: number;
}

export async function getAdminAssistantInsights(data: AdminDashboardData) {
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  
  // Calculate comprehensive business metrics
  const totalRevenue = data.payments.filter(p => p.status === 'completed')
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  const totalOrders = data.orders.length;
  const completedOrders = data.orders.filter(order => order.status === 'paid').length;
  const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;
  
  const topSellingItems = data.orderItems.reduce((acc, item) => {
    const itemName = item.menu_items?.name || 'Unknown';
    if (!acc[itemName]) {
      acc[itemName] = { quantity: 0, revenue: 0 };
    }
    acc[itemName].quantity += item.quantity;
    acc[itemName].revenue += item.price * item.quantity;
    return acc;
  }, {} as Record<string, { quantity: number; revenue: number }>);

  const topPerformers = Object.entries(topSellingItems)
    .sort(([,a], [,b]) => (b as { quantity: number; revenue: number }).revenue - (a as { quantity: number; revenue: number }).revenue)
    .slice(0, 10);

  const categoryPerformance = data.menuCategories.map(category => {
    const categoryItems = data.orderItems.filter(item => 
      item.menu_items?.category_id === category.id
    );
    const revenue = categoryItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const quantity = categoryItems.reduce((sum, item) => sum + item.quantity, 0);
    return { name: category.name, revenue, quantity };
  });

  const prompt = `
**SUPREME ADMIN ASSISTANT - COMPREHENSIVE BUSINESS INTELLIGENCE SYSTEM**

You are the Chief Executive Assistant AI, the most sophisticated business intelligence system for restaurant management. Provide comprehensive strategic insights and operational recommendations.

**EXECUTIVE DASHBOARD OVERVIEW:**
- Current Period: ${currentMonth}
- Total Revenue: ₹${totalRevenue.toFixed(2)}
- Total Orders: ${totalOrders} (${completedOrders} completed)
- Average Order Value: ₹${averageOrderValue.toFixed(2)}
- Menu Items: ${data.menuItems.length} active items
- Menu Categories: ${data.menuCategories.length} categories

**TOP PERFORMING ITEMS:**
${topPerformers.map(([name, stats]) => 
  `- ${name}: ${(stats as { quantity: number; revenue: number }).quantity} sold, ₹${(stats as { quantity: number; revenue: number }).revenue.toFixed(2)} revenue`
).join('\n')}

**CATEGORY PERFORMANCE:**
${categoryPerformance.map(cat => 
  `- ${cat.name}: ${cat.quantity} items sold, ₹${cat.revenue.toFixed(2)} revenue`
).join('\n')}

As the Supreme Admin Assistant, provide a comprehensive strategic analysis covering:

**1. EXECUTIVE SUMMARY & KEY INSIGHTS**
- Critical business performance indicators
- Immediate attention priorities
- Strategic opportunities identification
- Risk assessment and mitigation strategies

**2. FINANCIAL PERFORMANCE ANALYSIS**
- Revenue trend analysis and projections
- Profit margin optimization opportunities
- Cost structure analysis and recommendations
- Cash flow optimization strategies
- Investment priorities and ROI analysis

**3. OPERATIONAL EXCELLENCE OPTIMIZATION**
- Kitchen efficiency and workflow optimization
- Service quality and speed improvements
- Table turnover and capacity optimization
- Staff productivity and scheduling optimization
- Technology integration opportunities

**4. CUSTOMER EXPERIENCE & SATISFACTION**
- Customer journey optimization
- Service quality enhancement strategies
- Customer retention and loyalty programs
- Feedback analysis and improvement actions
- Personalization and customization opportunities

**5. STRATEGIC BUSINESS DEVELOPMENT**
- Market expansion opportunities
- New revenue stream identification
- Partnership and collaboration opportunities
- Brand positioning and differentiation strategies
- Competitive advantage enhancement

**6. MENU & PRODUCT STRATEGY**
- Menu engineering and optimization
- New product development opportunities
- Pricing strategy optimization
- Seasonal and promotional planning
- Cross-selling and upselling strategies

**7. INVENTORY & SUPPLY CHAIN OPTIMIZATION**
- Inventory management efficiency
- Supplier relationship optimization
- Cost reduction opportunities
- Quality assurance and control
- Sustainability and waste reduction

**8. HUMAN RESOURCES & TEAM MANAGEMENT**
- Staff performance optimization
- Training and development programs
- Recruitment and retention strategies
- Performance incentive programs
- Team productivity enhancement

**9. MARKETING & BRAND MANAGEMENT**
- Customer acquisition strategies
- Digital marketing optimization
- Social media and online presence
- Local community engagement
- Brand reputation management

**10. TECHNOLOGY & INNOVATION INTEGRATION**
- Digital transformation opportunities
- Automation and efficiency tools
- Data analytics and business intelligence
- Customer-facing technology solutions
- Operational technology upgrades

**11. COMPLIANCE & RISK MANAGEMENT**
- Regulatory compliance monitoring
- Food safety and quality standards
- Financial risk assessment
- Insurance and liability management
- Crisis management and contingency planning

**12. GROWTH & EXPANSION STRATEGY**
- Scalability analysis and planning
- New location evaluation criteria
- Franchise and licensing opportunities
- Market penetration strategies
- Long-term strategic roadmap

**13. SEASONAL & MARKET ADAPTATION**
- Seasonal business optimization
- Market trend integration
- Economic condition adaptation
- Local event and festival leverage
- Weather and external factor planning

**14. SUSTAINABILITY & SOCIAL RESPONSIBILITY**
- Environmental impact reduction
- Local sourcing and community support
- Waste reduction and recycling programs
- Energy efficiency optimization
- Social impact and CSR initiatives

**15. PERFORMANCE MONITORING & KPI OPTIMIZATION**
- Key performance indicator tracking
- Benchmark setting and achievement
- Performance dashboard optimization
- Regular review and adjustment protocols
- Continuous improvement methodologies

**16. CRISIS MANAGEMENT & CONTINGENCY PLANNING**
- Emergency response protocols
- Business continuity planning
- Supply chain disruption management
- Economic downturn preparation
- Reputation crisis management

**17. INNOVATION & FUTURE PLANNING**
- Industry trend anticipation
- Innovation pipeline development
- Future technology adoption
- Market evolution preparation
- Long-term vision alignment

**18. STAKEHOLDER MANAGEMENT**
- Investor relations optimization
- Customer communication strategies
- Supplier partnership enhancement
- Community relationship building
- Staff engagement and communication

For each area, provide:
- Current status assessment
- Specific improvement recommendations
- Implementation timeline and priorities
- Expected impact and ROI
- Risk assessment and mitigation strategies
- Success metrics and monitoring methods

Use sophisticated business intelligence approaches with specific Indian market context, local business practices, and cultural considerations. Provide executive-level strategic thinking with actionable operational recommendations.
`;

  return await getGroqCompletion(prompt);
}

export async function getStrategicBusinessPlan(data: AdminDashboardData, timeHorizon: string = "quarterly") {
  const prompt = `
**STRATEGIC BUSINESS PLANNING SPECIALIST - ${timeHorizon.toUpperCase()} ROADMAP**

You are a Senior Business Strategy Consultant specializing in restaurant growth and optimization. Create a comprehensive strategic plan.

**PLANNING HORIZON: ${timeHorizon}**
**CURRENT BUSINESS DATA:**
- Revenue: ₹${data.payments.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0).toFixed(2)}
- Orders: ${data.orders.length}
- Menu Items: ${data.menuItems.length}

**STRATEGIC PLANNING REQUIRED:**

**1. VISION & MISSION ALIGNMENT**
- Long-term vision clarification
- Mission statement optimization
- Core values integration
- Brand identity strengthening

**2. MARKET ANALYSIS & POSITIONING**
- Target market segmentation
- Competitive landscape analysis
- Market share growth opportunities
- Unique value proposition enhancement

**3. FINANCIAL STRATEGY & GROWTH**
- Revenue growth targets and strategies
- Profit margin improvement plans
- Cost optimization initiatives
- Investment and funding requirements

**4. OPERATIONAL EXCELLENCE ROADMAP**
- Process optimization and standardization
- Quality improvement initiatives
- Efficiency enhancement programs
- Technology integration planning

**5. CUSTOMER STRATEGY & EXPERIENCE**
- Customer acquisition and retention
- Service excellence programs
- Customer lifetime value optimization
- Loyalty and engagement strategies

**6. PRODUCT & MENU DEVELOPMENT**
- Menu innovation pipeline
- Seasonal offering strategies
- Premium product development
- Market trend integration

**7. HUMAN CAPITAL DEVELOPMENT**
- Talent acquisition and retention
- Skills development programs
- Leadership development initiatives
- Performance management systems

**8. MARKETING & BRAND STRATEGY**
- Brand positioning and messaging
- Digital marketing transformation
- Customer communication strategies
- Community engagement programs

**9. TECHNOLOGY & DIGITAL TRANSFORMATION**
- Digital infrastructure development
- Automation implementation
- Data analytics capabilities
- Customer-facing technology

**10. RISK MANAGEMENT & CONTINGENCY**
- Risk identification and mitigation
- Business continuity planning
- Crisis management protocols
- Insurance and protection strategies

**11. SUSTAINABILITY & SOCIAL IMPACT**
- Environmental responsibility initiatives
- Community contribution programs
- Sustainable sourcing strategies
- Social impact measurement

**12. PERFORMANCE MEASUREMENT & MONITORING**
- KPI development and tracking
- Performance review processes
- Continuous improvement mechanisms
- Success milestone definition

Provide a detailed ${timeHorizon} strategic plan with:
- SMART goals and objectives
- Specific action items and timelines
- Resource requirements and allocation
- Success metrics and milestones
- Risk assessment and mitigation plans
- Expected outcomes and ROI projections

Include Indian market-specific considerations and local business environment factors.
`;

  return await getGroqCompletion(prompt);
}

export async function getOperationalEfficiencyAnalysis(data: AdminDashboardData) {
  const prompt = `
**OPERATIONAL EFFICIENCY SPECIALIST - COMPREHENSIVE PERFORMANCE OPTIMIZATION**

You are a Senior Operations Consultant specializing in restaurant efficiency and productivity optimization.

**OPERATIONAL DATA ANALYSIS:**
- Total Orders Processed: ${data.orders.length}
- Order Items: ${data.orderItems.length}
- Menu Complexity: ${data.menuItems.length} items across ${data.menuCategories.length} categories

**EFFICIENCY ANALYSIS REQUIRED:**

**1. KITCHEN OPERATIONS OPTIMIZATION**
- Cooking time analysis and reduction strategies
- Kitchen workflow and layout optimization
- Equipment utilization and upgrade recommendations
- Food preparation process standardization

**2. SERVICE DELIVERY ENHANCEMENT**
- Order processing time optimization
- Table service efficiency improvement
- Customer wait time reduction strategies
- Service quality consistency protocols

**3. STAFF PRODUCTIVITY OPTIMIZATION**
- Work allocation and scheduling optimization
- Skills utilization and cross-training programs
- Performance measurement and improvement
- Motivation and engagement strategies

**4. INVENTORY & SUPPLY CHAIN EFFICIENCY**
- Inventory turnover optimization
- Waste reduction and cost control
- Supplier relationship and delivery optimization
- Quality control and assurance processes

**5. TECHNOLOGY INTEGRATION FOR EFFICIENCY**
- Automation opportunities identification
- Digital workflow optimization
- Real-time monitoring and analytics
- Communication and coordination tools

**6. CAPACITY UTILIZATION OPTIMIZATION**
- Seating capacity and table turnover
- Peak time management strategies
- Off-peak business generation
- Space utilization optimization

**7. QUALITY CONTROL & STANDARDIZATION**
- Standard operating procedure development
- Quality consistency maintenance
- Error reduction and prevention
- Customer satisfaction optimization

**8. COST EFFICIENCY & PROFITABILITY**
- Cost center analysis and optimization
- Resource allocation efficiency
- Profit margin improvement opportunities
- Financial performance optimization

Provide specific, measurable recommendations with:
- Current efficiency metrics assessment
- Improvement targets and timelines
- Implementation strategies and requirements
- Expected cost savings and ROI
- Performance monitoring mechanisms
`;

  return await getGroqCompletion(prompt);
}

export async function getCustomerInsightsAnalysis(data: AdminDashboardData) {
  const orderTimes = data.orders.map(order => new Date(order.created_at).getHours());
  const peakHours = orderTimes.reduce((acc, hour) => {
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const topPeakHours = Object.entries(peakHours)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const prompt = `
**CUSTOMER INTELLIGENCE SPECIALIST - COMPREHENSIVE BEHAVIORAL ANALYSIS**

You are a Customer Experience and Analytics Expert specializing in restaurant customer behavior and satisfaction optimization.

**CUSTOMER DATA OVERVIEW:**
- Total Orders: ${data.orders.length}
- Peak Hours: ${topPeakHours.map(([hour, count]) => `${hour}:00 (${count} orders)`).join(', ')}
- Menu Interaction: ${data.orderItems.length} items ordered

**CUSTOMER ANALYSIS REQUIRED:**

**1. CUSTOMER BEHAVIOR PATTERNS**
- Ordering patterns and preferences
- Peak time behavior analysis
- Seasonal and day-of-week trends
- Customer journey mapping

**2. CUSTOMER SEGMENTATION & PERSONAS**
- Customer demographic analysis
- Behavior-based segmentation
- Value-based customer classification
- Personalization opportunities

**3. CUSTOMER SATISFACTION & EXPERIENCE**
- Service quality assessment
- Food quality and consistency evaluation
- Overall experience satisfaction metrics
- Pain point identification and resolution

**4. CUSTOMER RETENTION & LOYALTY**
- Repeat customer identification
- Churn risk assessment
- Loyalty program optimization
- Customer lifetime value analysis

**5. CUSTOMER ACQUISITION STRATEGIES**
- New customer attraction methods
- Referral and word-of-mouth optimization
- Marketing channel effectiveness
- Customer acquisition cost optimization

**6. MENU PREFERENCES & TRENDS**
- Popular item identification
- Dietary preference analysis
- Price sensitivity assessment
- New item acceptance prediction

**7. DIGITAL ENGAGEMENT & TECHNOLOGY**
- Online ordering behavior
- Mobile app usage patterns
- Social media engagement analysis
- Digital touchpoint optimization

**8. FEEDBACK & COMMUNICATION**
- Customer feedback analysis
- Complaint resolution effectiveness
- Communication preference identification
- Engagement strategy optimization

**9. PRICING & VALUE PERCEPTION**
- Price sensitivity analysis
- Value-for-money assessment
- Willingness to pay premium
- Promotional effectiveness evaluation

**10. FUTURE CUSTOMER NEEDS PREDICTION**
- Emerging trend identification
- Changing preference anticipation
- Market evolution preparation
- Innovation requirement assessment

Provide comprehensive customer insights with:
- Specific behavioral patterns and trends
- Actionable improvement recommendations
- Customer experience enhancement strategies
- Revenue optimization through customer focus
- Personalization and customization opportunities
- Retention and loyalty building tactics

Focus on Indian customer preferences, cultural considerations, and local market dynamics.
`;

  return await getGroqCompletion(prompt);
}

export async function getCompetitiveAnalysisReport(data: AdminDashboardData, competitorData?: any[]) {
  const prompt = `
**COMPETITIVE INTELLIGENCE SPECIALIST - COMPREHENSIVE MARKET ANALYSIS**

You are a Market Research and Competitive Analysis Expert providing strategic intelligence for restaurant positioning.

**CURRENT BUSINESS POSITION:**
- Revenue Performance: ₹${data.payments.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0).toFixed(2)}
- Menu Portfolio: ${data.menuItems.length} items
- Order Volume: ${data.orders.length} orders

**COMPETITIVE ANALYSIS REQUIRED:**

**1. MARKET POSITIONING ANALYSIS**
- Current market position assessment
- Competitive advantages identification
- Weaknesses and improvement areas
- Differentiation opportunities

**2. COMPETITIVE BENCHMARKING**
- Performance metrics comparison
- Service quality benchmarking
- Menu and pricing analysis
- Customer satisfaction comparison

**3. MARKET SHARE & GROWTH OPPORTUNITIES**
- Current market share estimation
- Growth potential identification
- Market expansion opportunities
- Customer acquisition from competitors

**4. COMPETITIVE STRATEGY DEVELOPMENT**
- Direct competition response strategies
- Indirect competition positioning
- Blue ocean opportunity identification
- Sustainable competitive advantage building

**5. INNOVATION & DIFFERENTIATION**
- Unique value proposition development
- Innovation opportunities identification
- Technology adoption for advantage
- Service innovation possibilities

**6. PRICING STRATEGY & POSITIONING**
- Competitive pricing analysis
- Value-based pricing opportunities
- Premium positioning strategies
- Cost leadership possibilities

**7. MARKETING & BRAND DIFFERENTIATION**
- Brand positioning vs. competitors
- Marketing message differentiation
- Customer communication strategies
- Digital presence optimization

**8. OPERATIONAL EXCELLENCE COMPARISON**
- Service delivery comparison
- Operational efficiency benchmarking
- Quality standard assessment
- Process innovation opportunities

**9. CUSTOMER ACQUISITION STRATEGIES**
- Competitive customer switching tactics
- Market penetration strategies
- Customer retention enhancement
- Loyalty program differentiation

**10. FUTURE COMPETITIVE LANDSCAPE**
- Emerging competitor threats
- Market evolution prediction
- Disruptive technology impact
- Strategic partnership opportunities

Provide strategic recommendations for:
- Immediate competitive responses
- Medium-term positioning strategies
- Long-term competitive advantage building
- Market leadership pathway development
- Risk mitigation and opportunity maximization

Include specific action items, timelines, and expected outcomes for competitive advantage enhancement.
`;

  return await getGroqCompletion(prompt);
}

export async function getBusinessIntelligenceDashboard(data: AdminDashboardData) {
  const currentDate = new Date();
  const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  
  const thisMonthOrders = data.orders.filter(order => 
    new Date(order.created_at) >= thisMonth
  );
  const lastMonthOrders = data.orders.filter(order => 
    new Date(order.created_at) >= lastMonth && new Date(order.created_at) < thisMonth
  );

  const thisMonthRevenue = data.payments.filter(payment => 
    payment.status === 'completed' && new Date(payment.created_at) >= thisMonth
  ).reduce((sum, payment) => sum + payment.amount, 0);

  const lastMonthRevenue = data.payments.filter(payment => 
    payment.status === 'completed' && 
    new Date(payment.created_at) >= lastMonth && 
    new Date(payment.created_at) < thisMonth
  ).reduce((sum, payment) => sum + payment.amount, 0);

  const revenueGrowth = lastMonthRevenue > 0 ? 
    ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;

  const orderGrowth = lastMonthOrders.length > 0 ? 
    ((thisMonthOrders.length - lastMonthOrders.length) / lastMonthOrders.length * 100) : 0;

  const prompt = `
**BUSINESS INTELLIGENCE DASHBOARD - EXECUTIVE REPORTING SYSTEM**

You are the Chief Data Officer providing comprehensive business intelligence and strategic insights.

**CURRENT PERFORMANCE METRICS:**
- This Month Revenue: ₹${thisMonthRevenue.toFixed(2)}
- Last Month Revenue: ₹${lastMonthRevenue.toFixed(2)}
- Revenue Growth: ${revenueGrowth.toFixed(1)}%
- This Month Orders: ${thisMonthOrders.length}
- Last Month Orders: ${lastMonthOrders.length}
- Order Growth: ${orderGrowth.toFixed(1)}%

**EXECUTIVE DASHBOARD REQUIRED:**

**1. KEY PERFORMANCE INDICATORS (KPIs)**
- Revenue performance and trends
- Customer acquisition and retention rates
- Operational efficiency metrics
- Profitability and margin analysis

**2. FINANCIAL DASHBOARD**
- Revenue breakdown by categories
- Cost analysis and optimization
- Profit margin trends
- Cash flow and working capital

**3. OPERATIONAL DASHBOARD**
- Order processing efficiency
- Kitchen performance metrics
- Service quality indicators
- Inventory turnover rates

**4. CUSTOMER DASHBOARD**
- Customer satisfaction scores
- Customer lifetime value
- Repeat customer rates
- Customer acquisition costs

**5. MARKETING DASHBOARD**
- Marketing ROI analysis
- Customer acquisition channels
- Brand awareness metrics
- Digital engagement rates

**6. COMPETITIVE DASHBOARD**
- Market share analysis
- Competitive positioning
- Industry benchmark comparison
- Competitive advantage metrics

**7. PREDICTIVE ANALYTICS**
- Revenue forecasting
- Demand prediction
- Seasonal trend analysis
- Growth trajectory modeling

**8. ALERT SYSTEM**
- Performance threshold alerts
- Anomaly detection insights
- Risk indicator warnings
- Opportunity identification alerts

**9. STRATEGIC INSIGHTS**
- Business trend analysis
- Strategic recommendation engine
- Performance optimization opportunities
- Growth driver identification

**10. EXECUTIVE SUMMARY**
- Key insights and takeaways
- Critical action items
- Strategic priorities
- Performance highlights and concerns

Create a comprehensive business intelligence report with:
- Real-time performance indicators
- Trend analysis and forecasting
- Actionable insights and recommendations
- Strategic decision support information
- Risk and opportunity assessments

Format as an executive dashboard with clear metrics, visualizations descriptions, and strategic insights.
`;

  return await getGroqCompletion(prompt);
}
