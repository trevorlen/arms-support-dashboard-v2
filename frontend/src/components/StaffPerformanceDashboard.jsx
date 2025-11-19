import React, { useState } from 'react';
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
import { Users, Award, TrendingUp } from 'lucide-react';

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

const STATUS_COLORS = {
  'Open': '#EF4444',
  'Pending': '#F59E0B',
  'Resolved': '#10B981',
  'Closed': '#6B7280',
  'Awaiting Information': '#8B5CF6',
};

const StaffPerformanceDashboard = ({ tickets, loading }) => {
  const [sortBy, setSortBy] = useState('total'); // 'total', 'open', 'resolved', 'name'
  const [selectedAgent, setSelectedAgent] = useState(null);

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

  // Get unique platforms from all tickets
  const uniquePlatforms = [...new Set(tickets?.data?.map(t => t.platform || 'Unknown') || [])].sort();

  // Convert to array and sort
  let staffArray = Object.values(staffStats);

  if (sortBy === 'total') {
    staffArray.sort((a, b) => b.total - a.total);
  } else if (sortBy === 'name') {
    staffArray.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // Sort by specific platform
    staffArray.sort((a, b) => (b.byPlatform[sortBy] || 0) - (a.byPlatform[sortBy] || 0));
  }

  const totalTickets = staffArray.reduce((sum, staff) => sum + staff.total, 0);
  const totalStaff = staffArray.length;
  const avgTicketsPerStaff = totalStaff > 0 ? (totalTickets / totalStaff).toFixed(1) : 0;

  // Top performer
  const topPerformer = staffArray[0];

  // Get platform breakdown for selected agent
  const getPlatformBreakdown = (agentName) => {
    const agent = staffStats[agentName];
    if (!agent) return [];
    return Object.entries(agent.byPlatform)
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <option value="name">Name (A-Z)</option>
            </select>
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
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Detailed Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Tickets
                </th>
                {uniquePlatforms.map((platform) => (
                  <th key={platform} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {platform}
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {staffArray.map((staff, index) => {
                const percentage = ((staff.total / totalTickets) * 100).toFixed(1);
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="text-sm font-medium text-gray-900">{staff.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {staff.total}
                    </td>
                    {uniquePlatforms.map((platform) => (
                      <td key={platform} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {staff.byPlatform[platform] || 0}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {percentage}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 font-semibold">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Total
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {totalTickets}
                </td>
                {uniquePlatforms.map((platform) => (
                  <td key={platform} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {staffArray.reduce((sum, s) => sum + (s.byPlatform[platform] || 0), 0)}
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffPerformanceDashboard;
