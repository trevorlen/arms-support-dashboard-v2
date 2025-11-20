import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Users, Award, TrendingUp, Eye, EyeOff, DollarSign, Info, RefreshCw } from 'lucide-react';
import { getUSDtoCADRate, refreshExchangeRate } from '../services/currencyService';

// Blue, purple, and grey color scheme
const COLORS = ['#3B82F6', '#8B5CF6', '#6366F1', '#60A5FA', '#A78BFA', '#818CF8', '#6B7280', '#9CA3AF'];

// Agent ID to Name mapping
const AGENT_MAP = {
  154014816019: "Aaron Bourdeaux",
  154024618731: "Amey Patil",
  154021352180: "August Heza",
  154025663695: "Benjamin Lam",
  154025424111: "Chaya Pothuraju",
  154037322257: "Christina Ganung",
  154025424352: "Daren Lam",
  154039475394: "Eduardo Salazar",
  154025660131: "Erwin Fiten",
  154003138960: "Graham Rynbend",
  154033310397: "Jeremy Paradise",
  154025424364: "Jigar Gajjar",
  154037328933: "Jonathan.corbett",
  154017198579: "Julian Varela",
  154025441279: "Laura Munne",
  154003130993: "Lucas Borgo",
  154020756052: "Majid Taheri",
  154027750229: "Omorogbe Osagie",
  154007760706: "Pradeep Raghupatruni",
  154003130959: "Reg Grant",
  154021363424: "Robert De Vries",
  154003138850: "Rodney Sassi",
  154003789077: "Shanice Thompson",
  154008582398: "Soula Doufas",
  154005048040: "Trevor Len",
  154025450067: "Vitaliy Gorbenko",
};

// Base salaries (in original currency)
const SALARY_MAP_BASE = {
  "Trevor Len": { amount: 80000, currency: "CAD" },
  "Shanice Thompson": { amount: 80000, currency: "USD" },  // Will be converted to CAD
  "Rodney Sassi": { amount: 24000, currency: "CAD" },
  "Graham Rynbend": { amount: 48000, currency: "CAD" },
  "Julian Varela": { amount: 24000, currency: "USD" },  // Will be converted to CAD
};

// Hours per week for each employee
const HOURS_PER_WEEK_MAP = {
  "Trevor Len": 40,
  "Shanice Thompson": 40,
  "Rodney Sassi": 24,
  "Graham Rynbend": 30,
  "Julian Varela": 23,
};

// Calculate FTE (Full-Time Equivalent) factor (40 hours/week = 1.0 FTE)
const FTE_MAP = Object.fromEntries(
  Object.entries(HOURS_PER_WEEK_MAP).map(([name, hours]) => [name, hours / 40])
);

// Leave periods for staff (maternity/paternity/extended leave)
const LEAVE_PERIODS = {
  "Shanice Thompson": {
    start: new Date('2025-06-15'),
    end: new Date('2025-11-01'),
    type: 'Maternity Leave'
  }
};

const STATUS_COLORS = {
  'Open': '#EF4444',
  'Pending': '#F59E0B',
  'Resolved': '#10B981',
  'Closed': '#6B7280',
  'Awaiting Information': '#8B5CF6',
};

const StaffPerformanceDashboard = ({ tickets, loading, dateRange }) => {
  const [selectedPlatform, setSelectedPlatform] = useState('All Platforms'); // Platform filter
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showEfficiency, setShowEfficiency] = useState(false); // Toggle for efficiency metrics
  const [showEfficiencyTooltip, setShowEfficiencyTooltip] = useState(false); // Tooltip for efficiency explanation

  // Exchange rate state
  const [exchangeRate, setExchangeRate] = useState(1.36); // Default fallback rate
  const [rateLastUpdated, setRateLastUpdated] = useState(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateCached, setRateCached] = useState(false);

  // Fetch exchange rate on component mount
  useEffect(() => {
    const fetchRate = async () => {
      setRateLoading(true);
      try {
        const result = await getUSDtoCADRate();
        setExchangeRate(result.rate);
        setRateLastUpdated(result.timestamp);
        setRateCached(result.cached);
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
        // Keep fallback rate if fetch fails
      } finally {
        setRateLoading(false);
      }
    };

    fetchRate();
  }, []);

  // Handle manual refresh of exchange rate
  const handleRefreshRate = async () => {
    setRateLoading(true);
    try {
      const result = await refreshExchangeRate();
      setExchangeRate(result.rate);
      setRateLastUpdated(result.timestamp);
      setRateCached(false);
    } catch (error) {
      console.error('Error refreshing exchange rate:', error);
    } finally {
      setRateLoading(false);
    }
  };

  // Calculate salary maps based on current exchange rate using useMemo
  const { SALARY_MAP_ANNUAL, SALARY_MAP_DAILY } = useMemo(() => {
    const annual = {};

    // Convert USD salaries to CAD using current exchange rate
    Object.entries(SALARY_MAP_BASE).forEach(([name, { amount, currency }]) => {
      annual[name] = currency === 'USD' ? amount * exchangeRate : amount;
    });

    // Calculate daily salaries (annual / 365 calendar days)
    const daily = Object.fromEntries(
      Object.entries(annual).map(([name, annualSalary]) => [name, annualSalary / 365])
    );

    return { SALARY_MAP_ANNUAL: annual, SALARY_MAP_DAILY: daily };
  }, [exchangeRate]);

  // Helper function to calculate leave days overlap with date range
  const calculateLeaveDays = (staffName, rangeStartDate, rangeEndDate) => {
    const leavePeriod = LEAVE_PERIODS[staffName];
    if (!leavePeriod) return 0;

    const leaveStart = leavePeriod.start;
    const leaveEnd = leavePeriod.end;

    // Find overlap between date range and leave period
    const overlapStart = rangeStartDate > leaveStart ? rangeStartDate : leaveStart;
    const overlapEnd = rangeEndDate < leaveEnd ? rangeEndDate : leaveEnd;

    // If no overlap, return 0
    if (overlapStart > overlapEnd) return 0;

    // Calculate days in overlap (inclusive)
    const leaveDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
    return leaveDays;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  // Filter tickets by date range
  const startDate = dateRange ? new Date(dateRange.start_date) : null;
  const endDate = dateRange ? new Date(dateRange.end_date) : null;

  // Get unique platforms from all tickets (for filter dropdown)
  const allPlatforms = [...new Set(tickets?.data?.map(t => t.platform || 'Unknown') || [])].sort();
  const platformOptions = ['All Platforms', ...allPlatforms];

  // Build staff performance data
  const staffStats = {};
  let unassignedCount = 0;
  let unknownAgentCount = 0;

  // ARMS Support Product ID for filtering
  const ARMS_PRODUCT_ID = '154000020827';

  tickets?.data?.forEach((ticket) => {
    // Filter by date range
    if (startDate && endDate) {
      const ticketDate = new Date(ticket.created_at);
      if (ticketDate < startDate || ticketDate > endDate) return;
    }

    // Filter by product_id to ensure only ARMS Support tickets are counted
    if (ticket.product_id && String(ticket.product_id) !== ARMS_PRODUCT_ID) {
      return;
    }

    // Filter by selected platform
    const ticketPlatform = ticket.platform || 'Unknown';
    if (selectedPlatform !== 'All Platforms' && ticketPlatform !== selectedPlatform) {
      return;
    }

    // Try multiple possible field names for agent assignment
    const agentId = ticket.responder_id || ticket.agent_id;

    if (!agentId) {
      unassignedCount++;
      return;
    }

    const agentName = AGENT_MAP[agentId];

    // Only count tickets assigned to known staff members
    if (!agentName) {
      unknownAgentCount++;
      return;
    }

    if (!staffStats[agentName]) {
      staffStats[agentName] = {
        name: agentName,
        total: 0,
        byPlatform: {},
        tickets: [],
      };
    }

    staffStats[agentName].total++;
    staffStats[agentName].tickets.push(ticket);

    // Count by platform
    const platform = ticket.platform || 'Unknown';
    staffStats[agentName].byPlatform[platform] = (staffStats[agentName].byPlatform[platform] || 0) + 1;
  });

  // Get unique platforms from all tickets and shorten labels
  const uniquePlatforms = [...new Set(tickets?.data?.map(t => t.platform || 'Unknown') || [])]
    .sort()
    .map(p => {
      if (p === 'Multisport') return 'MULTI';
      if (p === 'Unknown') return 'UNDEFINED';
      return p;
    })
    .sort((a, b) => {
      // Move UNDEFINED to the end
      if (a === 'UNDEFINED') return 1;
      if (b === 'UNDEFINED') return -1;
      return a.localeCompare(b);
    });

  // Calculate date range from tickets (earliest to latest date)
  let dateRangeInDays = 30; // Default to 30 days if no tickets
  let rangeStartDate = new Date();
  let rangeEndDate = new Date();

  if (tickets?.data && tickets.data.length > 0) {
    const ticketDates = tickets.data
      .filter(t => t.created_at || t.created_date)
      .map(t => new Date(t.created_at || t.created_date).getTime())
      .filter(d => !isNaN(d));

    if (ticketDates.length > 0) {
      const earliestTime = Math.min(...ticketDates);
      const latestTime = Math.max(...ticketDates);
      rangeStartDate = new Date(earliestTime);
      rangeEndDate = new Date(latestTime);
      dateRangeInDays = Math.ceil((latestTime - earliestTime) / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
    }
  }

  // Convert to array and add efficiency metrics
  let staffArray = Object.values(staffStats);

  // Calculate efficiency metrics for staff with salary data
  staffArray.forEach(staff => {
    const dailySalary = SALARY_MAP_DAILY[staff.name];
    const fteFactor = FTE_MAP[staff.name];
    const hoursPerWeek = HOURS_PER_WEEK_MAP[staff.name];

    // Calculate leave days for this staff member
    const leaveDays = calculateLeaveDays(staff.name, rangeStartDate, rangeEndDate);
    const workingDays = Math.max(1, dateRangeInDays - leaveDays); // Ensure at least 1 day to avoid division by zero

    // Store leave information
    staff.leaveDays = leaveDays;
    staff.workingDays = workingDays;
    staff.onLeave = leaveDays > 0;
    if (staff.onLeave) {
      staff.leaveType = LEAVE_PERIODS[staff.name]?.type || 'Leave';
    }

    if (dailySalary && fteFactor && staff.total > 0) {
      // FTE-adjusted cost for the date range, excluding leave days
      // Formula: (daily_salary × working_days × FTE_factor) / tickets
      const periodCost = dailySalary * workingDays * fteFactor;
      staff.costPerTicket = periodCost / staff.total;
      staff.periodCost = periodCost;
      staff.fteFactor = fteFactor;
      staff.hasSalaryData = true;
    } else {
      staff.costPerTicket = null;
      staff.periodCost = null;
      staff.fteFactor = null;
      staff.hasSalaryData = false;
    }

    // Calculate tickets per hour, excluding leave days
    if (hoursPerWeek && staff.total > 0) {
      // Total hours worked in the date range = (hours per week / 7 days) × working days
      const totalHoursWorked = (hoursPerWeek / 7) * workingDays;
      staff.ticketsPerHour = staff.total / totalHoursWorked;
    } else {
      staff.ticketsPerHour = null;
    }

    // Calculate average sentiment improvement
    // Only count tickets with both sentiment_score and initial_sentiment_score
    const ticketsWithSentiment = staff.tickets.filter(t =>
      t.sentiment_score != null &&
      t.initial_sentiment_score != null
    );

    if (ticketsWithSentiment.length > 0) {
      const totalSentimentChange = ticketsWithSentiment.reduce((sum, ticket) => {
        return sum + (ticket.sentiment_score - ticket.initial_sentiment_score);
      }, 0);
      staff.avgSentimentImprovement = totalSentimentChange / ticketsWithSentiment.length;
      staff.sentimentTicketCount = ticketsWithSentiment.length;
    } else {
      staff.avgSentimentImprovement = null;
      staff.sentimentTicketCount = 0;
    }
  });

  // Calculate average metrics for staff with salary data (FTE-adjusted)
  const staffWithSalary = staffArray.filter(s => s.hasSalaryData);
  const avgTicketsForSalaried = staffWithSalary.length > 0
    ? staffWithSalary.reduce((sum, s) => sum + s.total, 0) / staffWithSalary.length
    : 0;
  const avgPeriodCost = staffWithSalary.length > 0
    ? staffWithSalary.reduce((sum, s) => sum + s.periodCost, 0) / staffWithSalary.length
    : 0;

  // Calculate efficiency score (normalized, FTE-adjusted)
  // Higher score = more efficient (more tickets relative to cost)
  staffArray.forEach(staff => {
    if (staff.hasSalaryData && avgTicketsForSalaried > 0 && avgPeriodCost > 0) {
      const ticketRatio = staff.total / avgTicketsForSalaried;
      const costRatio = staff.periodCost / avgPeriodCost;
      // Efficiency = (tickets relative to average) / (cost relative to average)
      // Higher ticket ratio and lower cost ratio = higher efficiency
      staff.efficiencyScore = ticketRatio / costRatio;
    } else {
      staff.efficiencyScore = null;
    }
  });


  // Sort by total tickets (descending)
  staffArray.sort((a, b) => b.total - a.total);

  const totalTickets = staffArray.reduce((sum, staff) => sum + staff.total, 0);
  const totalStaff = staffArray.length;
  const avgTicketsPerStaff = totalStaff > 0 ? (totalTickets / totalStaff).toFixed(1) : 0;

  // Top performer
  const topPerformer = staffArray[0];

  // Most efficient performer (based on efficiency score)
  const mostEfficient = staffArray
    .filter(s => s.efficiencyScore !== null)
    .sort((a, b) => b.efficiencyScore - a.efficiencyScore)[0];

  // Calculate overall average satisfaction delta across all staff
  const staffWithSentiment = staffArray.filter(s => s.avgSentimentImprovement !== null);
  const overallAvgSatisfactionDelta = staffWithSentiment.length > 0
    ? staffWithSentiment.reduce((sum, s) => sum + s.avgSentimentImprovement, 0) / staffWithSentiment.length
    : null;
  const totalSentimentTickets = staffArray.reduce((sum, s) => sum + s.sentimentTicketCount, 0);

  // Get platform breakdown for selected agent
  const getPlatformBreakdown = (agentName) => {
    const agent = staffStats[agentName];
    if (!agent) return [];
    return Object.entries(agent.byPlatform)
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Helper function to get efficiency color
  const getEfficiencyColor = (score) => {
    if (score >= 1.2) return 'text-green-600';
    if (score >= 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-800 mb-2">Total Staff</h3>
              <p className="text-3xl font-bold text-blue-900">{totalStaff}</p>
            </div>
            <Users className="w-12 h-12 text-blue-600 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-purple-800 mb-2">Assigned Tickets</h3>
              <p className="text-3xl font-bold text-purple-900">{totalTickets}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-purple-600 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-green-800 mb-2">Top Performer</h3>
              <p className="text-lg font-bold text-green-900">{topPerformer?.name || 'N/A'}</p>
              <p className="text-sm text-green-700">{topPerformer?.total || 0} tickets</p>
            </div>
            <Award className="w-12 h-12 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-amber-800 mb-2">Most Efficient</h3>
              {mostEfficient ? (
                <>
                  <p className="text-lg font-bold text-amber-900">{mostEfficient.name}</p>
                  <p className="text-sm text-amber-700">
                    Score: {mostEfficient.efficiencyScore.toFixed(2)}x
                  </p>
                </>
              ) : (
                <p className="text-lg font-bold text-amber-900">N/A</p>
              )}
            </div>
            <DollarSign className="w-12 h-12 text-amber-600 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-indigo-800 mb-2">Avg Satisfaction Δ</h3>
              {overallAvgSatisfactionDelta !== null ? (
                <>
                  <p className={`text-3xl font-bold ${
                    overallAvgSatisfactionDelta > 0 ? 'text-green-600' :
                    overallAvgSatisfactionDelta < 0 ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {overallAvgSatisfactionDelta > 0 ? '+' : ''}{overallAvgSatisfactionDelta.toFixed(1)}
                  </p>
                  <p className="text-xs text-indigo-700 mt-1">{totalSentimentTickets} tickets</p>
                </>
              ) : (
                <p className="text-lg font-bold text-gray-900">N/A</p>
              )}
            </div>
            <TrendingUp className={`w-12 h-12 opacity-50 ${
              overallAvgSatisfactionDelta !== null && overallAvgSatisfactionDelta > 0
                ? 'text-green-600'
                : 'text-indigo-600'
            }`} />
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="mr-2 w-6 h-6" />
            Staff Performance
            {selectedPlatform !== 'All Platforms' && (
              <span className="ml-2 text-lg text-primary-600">- {selectedPlatform}</span>
            )}
          </h2>
          <div className="flex items-center space-x-4">
            {/* Platform Filter Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Platform:</span>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {platformOptions.map((platform) => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {staffArray.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No staff performance data available
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={staffArray} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const staff = payload[0].payload;
                      const platformBreakdown = getPlatformBreakdown(staff.name);

                      return (
                        <div className="bg-white p-4 border border-gray-200 rounded shadow-lg max-w-sm">
                          <p className="font-semibold text-gray-900 mb-2">{staff.name}</p>
                          <p className="text-primary-600 mb-3">
                            {staff.total} tickets ({((staff.total / totalTickets) * 100).toFixed(1)}%)
                          </p>

                          {platformBreakdown.length > 0 && (
                            <div className="border-t border-gray-200 pt-2">
                              <p className="text-xs font-semibold text-gray-700 mb-2">Breakdown by Platform:</p>
                              <div className="space-y-1">
                                {platformBreakdown.map(({ platform, count }) => (
                                  <div key={platform} className="flex justify-between text-xs">
                                    <span className="text-gray-600">{platform}:</span>
                                    <span className="font-medium text-gray-900">{count}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="total" radius={[0, 8, 8, 0]}>
                  {staffArray.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Detailed Breakdown</h3>
          {/* Efficiency Toggle */}
          <button
            onClick={() => setShowEfficiency(!showEfficiency)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
              showEfficiency
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {showEfficiency ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">Efficiency Metrics</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff Member
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total (%)
                </th>
                {!showEfficiency && uniquePlatforms.map((platform) => (
                  <th key={platform} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {platform}
                  </th>
                ))}
                {showEfficiency && (
                  <>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tickets/Hour
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost/Ticket
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1 relative">
                        <span>Efficiency</span>
                        <div
                          className="relative inline-block"
                          onMouseEnter={() => setShowEfficiencyTooltip(true)}
                          onMouseLeave={() => setShowEfficiencyTooltip(false)}
                        >
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                          {showEfficiencyTooltip && (
                            <div className="absolute right-0 top-5 z-50 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg normal-case">
                              <div className="font-semibold mb-2">Efficiency Score Calculation:</div>
                              <div className="space-y-1.5 text-gray-200">
                                <p><strong>Formula:</strong> (Tickets / Team Avg Tickets) ÷ (Cost / Team Avg Cost)</p>
                                <p><strong>Cost includes:</strong></p>
                                <ul className="list-disc ml-4 space-y-0.5">
                                  <li>FTE adjustment based on hours/week</li>
                                  <li>Daily salary × date range days</li>
                                </ul>
                                <p className="mt-2"><strong>Score meaning:</strong></p>
                                <ul className="list-disc ml-4 space-y-0.5">
                                  <li>&gt;1.2x = High efficiency (green)</li>
                                  <li>0.8-1.2x = Average (yellow)</li>
                                  <li>&lt;0.8x = Below average (red)</li>
                                </ul>
                              </div>
                              <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1 relative group">
                        <span>Satisfaction Δ</span>
                        <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                        <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 w-52 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 normal-case">
                          <div className="font-semibold mb-1">Average Satisfaction Change</div>
                          <div className="text-gray-200">
                            Measures how much customer satisfaction improved from ticket creation to resolution. Scale: 0-100.
                            <div className="mt-1">
                              <span className="text-green-400">Positive</span> = improved satisfaction
                            </div>
                          </div>
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                      </div>
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staffArray.filter(staff => {
                // Only show these 5 staff members in the table
                const displayNames = ['Trevor Len', 'Rodney Sassi', 'Graham Rynbend', 'Shanice Thompson', 'Julian Varela'];
                return displayNames.includes(staff.name);
              }).map((staff, index) => {
                const percentage = Math.round((staff.total / totalTickets) * 100);
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 max-w-[180px]">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="text-sm font-medium text-gray-900 truncate">{staff.name}</span>
                        {staff.onLeave && (
                          <span
                            className="px-1.5 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700 rounded border border-purple-300 flex-shrink-0"
                            title={`${staff.leaveType}: ${staff.leaveDays} days during this period (adjusted metrics)`}
                          >
                            {staff.leaveType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                      {staff.total} <span className="text-gray-500 font-normal">({percentage}%)</span>
                    </td>
                    {!showEfficiency && uniquePlatforms.map((platform) => (
                      <td key={platform} className="px-2 py-2 whitespace-nowrap text-sm text-gray-600 text-center">
                        {staff.byPlatform[platform === 'UNDEFINED' ? 'Unknown' : platform === 'MULTI' ? 'Multisport' : platform] || 0}
                      </td>
                    ))}
                    {showEfficiency && (
                      <>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                          {staff.ticketsPerHour !== null ? (
                            <span>{staff.ticketsPerHour.toFixed(2)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 text-center">
                          {staff.costPerTicket !== null ? (
                            <span>${staff.costPerTicket.toFixed(2)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-center">
                          {staff.efficiencyScore !== null ? (
                            <span className={getEfficiencyColor(staff.efficiencyScore)}>
                              {staff.efficiencyScore.toFixed(2)}x
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                          {staff.avgSentimentImprovement !== null ? (
                            <span
                              className={`font-semibold ${
                                staff.avgSentimentImprovement > 0
                                  ? 'text-green-700'
                                  : staff.avgSentimentImprovement < 0
                                  ? 'text-red-700'
                                  : 'text-gray-600'
                              }`}
                              title={`Based on ${staff.sentimentTicketCount} ticket${staff.sentimentTicketCount !== 1 ? 's' : ''} with sentiment data`}
                            >
                              {staff.avgSentimentImprovement > 0 ? '+' : ''}
                              {staff.avgSentimentImprovement.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 font-semibold">
              <tr>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                  Total
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                  {totalTickets} <span className="text-gray-500 font-normal">(100%)</span>
                </td>
                {!showEfficiency && uniquePlatforms.map((platform) => (
                  <td key={platform} className="px-2 py-2 whitespace-nowrap text-sm text-gray-900 text-center">
                    {staffArray.reduce((sum, s) => sum + (s.byPlatform[platform === 'UNDEFINED' ? 'Unknown' : platform === 'MULTI' ? 'Multisport' : platform] || 0), 0)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffPerformanceDashboard;
