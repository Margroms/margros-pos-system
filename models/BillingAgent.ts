
import { getGroqCompletion } from "./AIAgent";

interface ComprehensiveInsightData {
  completedPayments: any[];
  orderItems: any[];
  tableBills: any[];
  timeRange: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  paymentMethodBreakdown: Record<string, number>;
  topSellingItems: Array<{name: string, quantity: number, revenue: number}>;
  hourlyTrends: Array<{hour: number, orders: number, revenue: number}>;
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercentage(value: number, total: number): string {
  return total > 0 ? `${((value/total)*100).toFixed(1)}%` : '0%';
}

export async function getBillingInsights(data: ComprehensiveInsightData) {
  // Ensure we have valid data
  const safeData = {
    ...data,
    completedPayments: data.completedPayments || [],
    orderItems: data.orderItems || [],
    tableBills: data.tableBills || [],
    totalRevenue: data.totalRevenue || 0,
    totalOrders: data.totalOrders || 0,
    averageOrderValue: data.averageOrderValue || 0,
    paymentMethodBreakdown: data.paymentMethodBreakdown || {},
    topSellingItems: data.topSellingItems || [],
    hourlyTrends: data.hourlyTrends || []
  };

  const prompt = `
You are analyzing restaurant sales data for a comprehensive business report. All monetary values are in Indian Rupees (₹). Provide insights in a well-structured format with clear headings and actionable recommendations.

**SALES PERFORMANCE OVERVIEW**
• Analysis Period: ${safeData.timeRange}
• Total Revenue Generated: ${formatCurrency(safeData.totalRevenue)}
• Total Orders Processed: ${safeData.totalOrders}
• Average Order Value: ${formatCurrency(safeData.averageOrderValue)}
• Orders per Day: ${(safeData.totalOrders/7).toFixed(1)}

**RECENT TRANSACTION DETAILS**
${safeData.completedPayments.slice(0, 15).map(payment => {
  const date = new Date(payment.created_at).toLocaleDateString('en-IN');
  const time = new Date(payment.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return `• Order #${payment.order_id}: ${formatCurrency(payment.amount)} via ${payment.payment_method.toUpperCase()} on ${date} at ${time}`;
}).join('\n')}

**PAYMENT METHOD ANALYSIS**
${Object.entries(safeData.paymentMethodBreakdown).map(([method, amount]) => 
  `• ${method.toUpperCase()}: ${formatCurrency(amount)} (${formatPercentage(amount, safeData.totalRevenue)})`
).join('\n')}

**TOP PERFORMING MENU ITEMS**
${safeData.topSellingItems.slice(0, 8).map((item, index) => 
  `${index + 1}. ${item.name}
   • Quantity Sold: ${item.quantity} units
   • Revenue Generated: ${formatCurrency(item.revenue)}
   • Average Price: ${formatCurrency(item.revenue/item.quantity)}`
).join('\n\n')}

**HOURLY SALES PATTERN**
${safeData.hourlyTrends.length > 0 ? safeData.hourlyTrends.map(trend => 
  `• ${trend.hour}:00 - ${trend.orders} orders, ${formatCurrency(trend.revenue)}`
).join('\n') : '• No hourly data available for this period'}

**CURRENT OPERATIONAL STATUS**
${safeData.tableBills.length > 0 ? 
  `• Pending Bills: ${safeData.tableBills.length} tables
• Total Pending Amount: ${formatCurrency(safeData.tableBills.reduce((sum, bill) => sum + bill.totalAmount, 0))}
• Average Pending Bill: ${formatCurrency(safeData.tableBills.reduce((sum, bill) => sum + bill.totalAmount, 0) / safeData.tableBills.length)}

Pending Tables:
${safeData.tableBills.map(bill => `  - Table ${bill.table.number}: ${formatCurrency(bill.totalAmount)}`).join('\n')}` :
  '• No pending bills - All tables are clear'
}

Based on this comprehensive data, provide detailed analysis covering:

**REVENUE PERFORMANCE**
- Overall financial health and growth indicators
- Revenue per day trends and patterns
- Comparison with industry standards for similar restaurants

**CUSTOMER BEHAVIOR INSIGHTS**
- Ordering patterns and preferences analysis
- Peak dining times and customer flow
- Average spending habits and frequency

**OPERATIONAL EFFICIENCY**
- Payment method preferences and digital payment adoption
- Table turnover rates and service efficiency
- Staff performance indicators

**MENU OPTIMIZATION**
- Best performing items and profit drivers
- Underperforming items that need attention
- Pricing strategy recommendations

**STRATEGIC RECOMMENDATIONS**
- Immediate actionable improvements
- Long-term growth strategies
- Marketing and promotional opportunities
- Operational efficiency enhancements

**PEAK HOURS & STAFFING**
- Busiest operational periods
- Staffing optimization suggestions
- Resource allocation recommendations

Please format your response with clear sections, use bullet points for key insights, and ensure all currency amounts are properly formatted in Indian Rupees (₹). Provide specific, actionable recommendations that the restaurant management can implement immediately.
`;

  return await getGroqCompletion(prompt);
}

export async function getQuickInsights(recentPayments: any[]) {
  const safePayments = recentPayments || [];
  const totalRevenue = safePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const avgOrder = safePayments.length > 0 ? totalRevenue / safePayments.length : 0;
  
  const paymentMethods = safePayments.reduce((acc, p) => {
    acc[p.payment_method] = (acc[p.payment_method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostPopularMethod = Object.entries(paymentMethods)
    .sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || 'cash';

  const prompt = `
Provide a quick 4-5 sentence summary of recent restaurant sales performance:

**Recent Sales Data:**
• Total Recent Payments: ${safePayments.length}
• Total Revenue: ${formatCurrency(totalRevenue)}
• Average Order Value: ${formatCurrency(avgOrder)}
• Most Popular Payment Method: ${mostPopularMethod.toUpperCase()}

Recent Transactions:
${safePayments.slice(0, 8).map(p => `• Order ${p.order_id}: ${formatCurrency(p.amount || 0)} via ${p.payment_method}`).join('\n')}

Focus on:
- Total revenue performance in ₹
- Average order trends
- Payment preferences
- Any notable patterns

Keep response concise, professional, and use Indian currency formatting.
`;

  return await getGroqCompletion(prompt);
}
