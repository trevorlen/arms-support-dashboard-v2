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

const STATUS_COLORS = {
  'Open': '#EF4444',
  'Pending': '#F59E0B',
  'Resolved': '#10B981',
  'Closed': '#6B7280',
  'Awaiting Information': '#8B5CF6',
};

const StaffPerformanceDashboard = ({ tickets, loading }) => {
  const [sortBy, setSortBy] = useState('total'); // 'total', 'open', 'resolved', 'name', 'efficiency', 'costPerTicket'
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  // Build staff performance data
  const staffStats = {};
  let unassignedCount = 0;
  let unknownAgentCount = 0;

  // ARMS Support Product ID for filtering
  const ARMS_PRODUCT_ID = '154000020827';

  tickets?.data?.forEach((ticket) => {
    // Filter by product_id to ensure only ARMS Support tickets are counted
    if (ticket.product_id && String(ticket.product_id) !== ARMS_PRODUCT_ID) {
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
    .map(p => p === 'Multisport' ? 'MULTI' : p);

  // Calculate date range from tickets (earliest to latest date)
  let dateRangeInDays = 30; // Default to 30 days if no tickets
  if (tickets?.data && tickets.data.length > 0) {
    const ticketDates = tickets.data
      .filter(t => t.created_at || t.created_date)
      .map(t => new Date(t.created_at || t.created_date).getTime())
      .filter(d => !isNaN(d));

    if (ticketDates.length > 0) {
      const earliestDate = Math.min(...ticketDates);
      const latestDate = Math.max(...ticketDates);
      dateRangeInDays = Math.ceil((latestDate - earliestDate) / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
    }
  }

  // Convert to array and add efficiency metrics
  let staffArray = Object.values(staffStats);

  // Calculate efficiency metrics for staff with salary data
  staffArray.forEach(staff => {
    const dailySalary = SALARY_MAP_DAILY[staff.name];
    const fteFactor = FTE_MAP[staff.name];
    const hoursPerWeek = HOURS_PER_WEEK_MAP[staff.name];

    if (dailySalary && fteFactor && staff.total > 0) {
      // FTE-adjusted cost for the date range
      // Formula: (daily_salary × days × FTE_factor) / tickets
      const periodCost = dailySalary * dateRangeInDays * fteFactor;
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

    // Calculate tickets per hour
    if (hoursPerWeek && staff.total > 0) {
      // Total hours worked in the date range = (hours per week / 7 days) × date range days
      const totalHoursWorked = (hoursPerWeek / 7) * dateRangeInDays;
      staff.ticketsPerHour = staff.total / totalHoursWorked;
    } else {
      staff.ticketsPerHour = null;
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


  // Sort logic
  if (sortBy === 'total') {
    staffArray.sort((a, b) => b.total - a.total);
  } else if (sortBy === 'name') {
    staffArray.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'efficiency') {
    staffArray.sort((a, b) => {
      if (a.efficiencyScore === null) return 1;
      if (b.efficiencyScore === null) return -1;
      return b.efficiencyScore - a.efficiencyScore;
    });
  } else if (sortBy === 'costPerTicket') {
    staffArray.sort((a, b) => {
      if (a.costPerTicket === null) return 1;
      if (b.costPerTicket === null) return -1;
      return a.costPerTicket - b.costPerTicket; // Lower cost is better
    });
  } else if (sortBy === 'ticketsPerHour') {
    staffArray.sort((a, b) => {
      if (a.ticketsPerHour === null) return 1;
      if (b.ticketsPerHour === null) return -1;
      return b.ticketsPerHour - a.ticketsPerHour; // Higher tickets per hour is better
    });
  } else {
    // Sort by specific platform
    staffArray.sort((a, b) => (b.byPlatform[sortBy] || 0) - (a.byPlatform[sortBy] || 0));
  }

  const totalTickets = staffArray.reduce((sum, staff) => sum + staff.total, 0);
  const totalStaff = staffArray.length;
  const avgTicketsPerStaff = totalStaff > 0 ? (totalTickets / totalStaff).toFixed(1) : 0;

  // Top performer
  const topPerformer = staffArray[0];

  // Most efficient performer (based on efficiency score)
  const mostEfficient = staffArray
    .filter(s => s.efficiencyScore !== null)
    .sort((a, b) => b.efficiencyScore - a.efficiencyScore)[0];

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
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6">
          <div>
            <h3 className="text-sm font-medium text-gray-800 mb-2">Untracked</h3>
            <p className="text-lg font-bold text-gray-900">
              {unassignedCount > 0 && <span className="block">Unassigned: {unassignedCount}</span>}
              {unknownAgentCount > 0 && <span className="block">Unknown Agent: {unknownAgentCount}</span>}
              {unassignedCount === 0 && unknownAgentCount === 0 && <span className="text-3xl">✓</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="mr-2 w-6 h-6" />
            Staff Performance
          </h2>
          <div className="flex items-center space-x-4">
            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="total">Total Tickets</option>
                {uniquePlatforms.map((platform) => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
                {showEfficiency && <option value="efficiency">Efficiency Score</option>}
                {showEfficiency && <option value="costPerTicket">Cost Per Ticket</option>}
                {showEfficiency && <option value="ticketsPerHour">Tickets/Hour</option>}
                <option value="name">Name (A-Z)</option>
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
          <div className="flex items-center space-x-3">
            {/* Exchange Rate Indicator */}
            <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <div className="flex flex-col">
                <span className="text-xs text-blue-600 font-medium">
                  1 USD = {exchangeRate.toFixed(4)} CAD
                </span>
                {rateLastUpdated && (
                  <span className="text-[10px] text-blue-500">
                    {rateCached ? 'Cached' : 'Live'} • {rateLastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <button
                onClick={handleRefreshRate}
                disabled={rateLoading}
                className="ml-2 p-1 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
                title="Refresh exchange rate"
              >
                <RefreshCw className={`w-3 h-3 text-blue-600 ${rateLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

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
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staffArray.map((staff, index) => {
                const percentage = Math.round((staff.total / totalTickets) * 100);
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="text-sm font-medium text-gray-900">{staff.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 text-center">
                      {staff.total} <span className="text-gray-500 font-normal">({percentage}%)</span>
                    </td>
                    {!showEfficiency && uniquePlatforms.map((platform) => (
                      <td key={platform} className="px-2 py-2 whitespace-nowrap text-sm text-gray-600 text-center">
                        {staff.byPlatform[platform] || 0}
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
                    {staffArray.reduce((sum, s) => sum + (s.byPlatform[platform] || 0), 0)}
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
