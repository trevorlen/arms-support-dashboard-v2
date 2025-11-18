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
} from 'recharts';
import { ChevronRight, ChevronDown } from 'lucide-react';

// Blue, purple, and grey color scheme
const COLORS = ['#3B82F6', '#8B5CF6', '#6366F1', '#60A5FA', '#A78BFA', '#818CF8', '#6B7280', '#9CA3AF'];

const TicketTypesDashboard = ({ tickets, summary, loading }) => {
  const [selectedTicketType, setSelectedTicketType] = useState(null);
  const [selectedIssueType, setSelectedIssueType] = useState(null);
  const [expandedTypes, setExpandedTypes] = useState({});
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  // Get unique platforms
  const platforms = [...new Set(tickets?.data?.map(t => t.platform || 'Unknown') || [])].sort();
  const platformTotals = {};
  tickets?.data?.forEach((ticket) => {
    const platform = ticket.platform || 'Unknown';
    platformTotals[platform] = (platformTotals[platform] || 0) + 1;
  });

  // Filter tickets by selected platform
  const filteredTickets = selectedPlatform === 'all'
    ? tickets?.data || []
    : tickets?.data?.filter(t => (t.platform || 'Unknown') === selectedPlatform) || [];

  // Build two-level structure: custom_ticket_type -> issue_type
  const hierarchy = {};
  filteredTickets.forEach((ticket) => {
    const ticketType = ticket.custom_ticket_type || 'Unknown';
    const issueType = ticket.issue_type || 'Unknown';

    // Initialize ticket type
    if (!hierarchy[ticketType]) {
      hierarchy[ticketType] = {
        count: 0,
        issues: {}
      };
    }
    hierarchy[ticketType].count++;

    // Initialize issue type
    if (!hierarchy[ticketType].issues[issueType]) {
      hierarchy[ticketType].issues[issueType] = 0;
    }
    hierarchy[ticketType].issues[issueType]++;
  });

  // Convert to sorted arrays
  const ticketTypes = Object.entries(hierarchy)
    .map(([name, data]) => ({
      name,
      count: data.count,
      issues: data.issues
    }))
    .sort((a, b) => b.count - a.count);

  const total = filteredTickets.length || 0;

  const toggleExpanded = (type) => {
    setExpandedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Get issue types for selected ticket type
  const getIssueTypes = (ticketType) => {
    if (!ticketType || !hierarchy[ticketType]) return [];
    return Object.entries(hierarchy[ticketType].issues)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  return (
    <div className="space-y-6">
      {/* Platform Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by Platform</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedPlatform('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedPlatform === 'all'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Platforms ({tickets?.data?.length || 0})
          </button>
          {platforms.map((platform, index) => (
            <button
              key={index}
              onClick={() => setSelectedPlatform(platform)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedPlatform === platform
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {platform} ({platformTotals[platform]})
            </button>
          ))}
        </div>
      </div>

      {/* Header and Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span className="mr-2">📋</span>
          Ticket Types
          {selectedPlatform !== 'all' && (
            <span className="ml-2 text-lg text-primary-600">- {selectedPlatform}</span>
          )}
        </h2>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Total Tickets</h3>
            <p className="text-3xl font-bold text-blue-900">{total}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
            <h3 className="text-sm font-medium text-purple-800 mb-2">Ticket Types</h3>
            <p className="text-3xl font-bold text-purple-900">{ticketTypes.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
            <h3 className="text-sm font-medium text-green-800 mb-2">Most Common</h3>
            <p className="text-xl font-bold text-green-900">{ticketTypes[0]?.name || 'N/A'}</p>
            <p className="text-sm text-green-700">{ticketTypes[0]?.count || 0} tickets</p>
          </div>
        </div>

        {/* Bar Chart - Ticket Types */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Ticket Types</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={ticketTypes} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={200} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const percentage = ((payload[0].value / total) * 100).toFixed(1);
                    return (
                      <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
                        <p className="font-semibold text-gray-900">{payload[0].payload.name}</p>
                        <p className="text-primary-600">
                          {payload[0].value} tickets ({percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {ticketTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expandable Ticket Breakdown Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Ticket Breakdown</h3>
        <div className="space-y-2">
          {ticketTypes.map((ticketType, index) => {
            const isExpanded = expandedTypes[ticketType.name];
            const issueTypes = getIssueTypes(ticketType.name);
            const percentage = ((ticketType.count / total) * 100).toFixed(1);

            return (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Ticket Type */}
                <div
                  onClick={() => toggleExpanded(ticketType.name)}
                  className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="font-semibold text-gray-900">{ticketType.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">{percentage}%</span>
                    <span className="font-semibold text-gray-900">{ticketType.count} tickets</span>
                  </div>
                </div>

                {/* Issue Types (shown when expanded) */}
                {isExpanded && (
                  <div className="bg-white">
                    {issueTypes.map((issueType, issueIndex) => {
                      const issuePercentage = ((issueType.count / ticketType.count) * 100).toFixed(1);

                      return (
                        <div key={issueIndex} className="border-t border-gray-200">
                          <div className="flex items-center justify-between p-4 pl-12 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center space-x-3">
                              <span className="text-gray-700 font-medium">{issueType.name}</span>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-500">{issuePercentage}% of type</span>
                              <span className="font-medium text-gray-700">{issueType.count} tickets</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected View - Detail Charts */}
      {selectedTicketType && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Level 2: Issue Types for "{selectedTicketType}"
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getIssueTypes(selectedTicketType)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={180} />
              <Tooltip />
              <Bar dataKey="count" name="Tickets" fill="#8B5CF6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {selectedTicketType && selectedIssueType && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Level 3: Type Details for "{selectedTicketType}" → "{selectedIssueType}"
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getTypeDetails(selectedTicketType, selectedIssueType)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={200} />
              <Tooltip />
              <Bar dataKey="count" name="Tickets" fill="#6366F1" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default TicketTypesDashboard;
