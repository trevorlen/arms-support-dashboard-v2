import React, { useState } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { parseISO, getDay, format } from 'date-fns';
import PlatformLogo from './PlatformLogo';

// Blue, purple, and grey color scheme
const COLORS = ['#3B82F6', '#8B5CF6', '#6366F1', '#60A5FA', '#A78BFA', '#818CF8', '#6B7280'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DayOfWeekDashboard = ({ tickets, loading, dateRange }) => {
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

  // Filter tickets by date range
  const startDate = dateRange ? new Date(dateRange.start_date) : null;
  const endDate = dateRange ? new Date(dateRange.end_date) : null;

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

  // Initialize day counts
  const dayCounts = Array(7).fill(0);

  // Count tickets by day of week
  filteredTickets.forEach((ticket) => {
    if (ticket.created_at) {
      try {
        const date = parseISO(ticket.created_at);

        // Filter by date range
        if (startDate && endDate) {
          const ticketDate = new Date(ticket.created_at);
          if (ticketDate < startDate || ticketDate > endDate) return;
        }

        const dayOfWeek = getDay(date);
        dayCounts[dayOfWeek]++;
      } catch (error) {
        console.error('Error parsing date:', ticket.created_at);
      }
    }
  });

  const dayData = DAYS.map((day, index) => ({
    day,
    dayShort: day.substring(0, 3),
    count: dayCounts[index],
    dayIndex: index,
  }));

  const total = dayData.reduce((sum, item) => sum + item.count, 0);
  const average = (total / 7).toFixed(1);
  const busiestDay = dayData.reduce((max, item) => (item.count > max.count ? item : max));

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
            All Platforms
          </button>
          {platforms.map((platform, index) => (
            <button
              key={index}
              onClick={() => setSelectedPlatform(platform)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                selectedPlatform === platform
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <PlatformLogo platform={platform} size="small" />
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span className="mr-2">📅</span>
          Tickets by Day of Week
          {selectedPlatform !== 'all' && (
            <span className="ml-2 flex items-center gap-2">
              - <PlatformLogo platform={selectedPlatform} size="medium" />
            </span>
          )}
        </h2>

        {total === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No day of week data available
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Total Tickets</h3>
                <p className="text-3xl font-bold text-blue-900">{total}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                <h3 className="text-sm font-medium text-green-800 mb-2">Daily Average</h3>
                <p className="text-3xl font-bold text-green-900">{average}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                <h3 className="text-sm font-medium text-purple-800 mb-2">Busiest Day</h3>
                <p className="text-3xl font-bold text-purple-900">{busiestDay.day}</p>
                <p className="text-sm text-purple-700">{busiestDay.count} tickets</p>
              </div>
            </div>

            {/* Area Chart */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Weekly Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dayData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const percentage = ((payload[0].value / total) * 100).toFixed(1);
                        return (
                          <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
                            <p className="font-semibold text-gray-900">{payload[0].payload.day}</p>
                            <p className="text-primary-600">
                              {payload[0].value} tickets ({percentage}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#667eea"
                    fill="#667eea"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Day Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
              {dayData.map((day, index) => {
                const percentage = total > 0 ? ((day.count / total) * 100).toFixed(1) : 0;
                const isBusiest = day.day === busiestDay.day;

                return (
                  <div
                    key={index}
                    className={`rounded-lg p-4 text-center border-2 ${
                      isBusiest
                        ? 'bg-primary-50 border-primary-400'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <h4 className={`text-sm font-semibold mb-2 ${isBusiest ? 'text-primary-700' : 'text-gray-700'}`}>
                      {day.dayShort}
                      {isBusiest && ' 🔥'}
                    </h4>
                    <p className={`text-2xl font-bold ${isBusiest ? 'text-primary-900' : 'text-gray-900'}`}>
                      {day.count}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{percentage}%</p>
                  </div>
                );
              })}
            </div>

          </>
        )}
      </div>
    </div>
  );
};

export default DayOfWeekDashboard;
