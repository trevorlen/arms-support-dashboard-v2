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
import { parseISO, getHours } from 'date-fns';
import PlatformLogo from './PlatformLogo';

const HourOfDayDashboard = ({ tickets, loading, dateRange }) => {
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

  // ARMS Support Product ID for filtering
  const ARMS_PRODUCT_ID = '154000020827';

  // Filter tickets by date range
  const startDate = dateRange ? new Date(dateRange.start_date) : null;
  const endDate = dateRange ? new Date(dateRange.end_date) : null;

  // Get unique platforms
  const platforms = [...new Set(tickets?.data?.map(t => t.platform || 'Unknown') || [])].sort();
  const platformTotals = {};
  tickets?.data?.forEach((ticket) => {
    // Filter by product_id to ensure only ARMS Support tickets
    const matchesProduct = !ticket.product_id || String(ticket.product_id) === ARMS_PRODUCT_ID;
    if (!matchesProduct) return;

    const platform = ticket.platform || 'Unknown';
    platformTotals[platform] = (platformTotals[platform] || 0) + 1;
  });

  // Filter tickets by selected platform and date range
  const filteredTickets = (selectedPlatform === 'all'
    ? tickets?.data || []
    : tickets?.data?.filter(t => (t.platform || 'Unknown') === selectedPlatform) || [])
    .filter((ticket) => {
      // Filter by product_id to ensure only ARMS Support tickets
      const matchesProduct = !ticket.product_id || String(ticket.product_id) === ARMS_PRODUCT_ID;
      if (!matchesProduct) return false;

      // Filter by date range
      if (startDate && endDate && ticket.created_at) {
        const ticketDate = new Date(ticket.created_at);
        if (ticketDate < startDate || ticketDate > endDate) return false;
      }
      return true;
    });

  // Group tickets by hour of day
  const hourCounts = Array(24)
    .fill(0)
    .reduce((acc, _, hour) => {
      acc[hour] = 0;
      return acc;
    }, {});

  filteredTickets.forEach((ticket) => {
    if (ticket.created_at) {
      try {
        const date = parseISO(ticket.created_at);
        const hour = getHours(date);
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      } catch (error) {
        console.error('Error parsing date:', ticket.created_at);
      }
    }
  });

  const hourData = Object.entries(hourCounts).map(([hour, count]) => ({
    hour: parseInt(hour),
    hourLabel: `${parseInt(hour)}:00`,
    count,
    timeOfDay:
      hour < 6
        ? 'Night'
        : hour < 12
        ? 'Morning'
        : hour < 18
        ? 'Afternoon'
        : 'Evening',
  }));

  const total = hourData.reduce((sum, item) => sum + item.count, 0);
  const average = (total / 24).toFixed(1);
  const peakHour = hourData.reduce((max, item) => (item.count > max.count ? item : max));

  // Time period breakdown
  const timeOfDayStats = hourData.reduce((acc, item) => {
    acc[item.timeOfDay] = (acc[item.timeOfDay] || 0) + item.count;
    return acc;
  }, {});

  const timeOfDayData = Object.entries(timeOfDayStats).map(([name, count]) => ({
    name,
    count,
    percentage: ((count / total) * 100).toFixed(1),
  }));

  return (
    <div className="space-y-6">
      {/* Platform Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by Platform</h3>
        <div className="flex flex-wrap gap-2 justify-center">
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
          <span className="mr-2">🕐</span>
          Tickets by Hour of Day
          {selectedPlatform !== 'all' && (
            <span className="ml-2 flex items-center gap-2">
              - <PlatformLogo platform={selectedPlatform} size="medium" />
            </span>
          )}
        </h2>

        {total === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No time data available
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
                <h3 className="text-sm font-medium text-green-800 mb-2">Average per Hour</h3>
                <p className="text-3xl font-bold text-green-900">{average}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                <h3 className="text-sm font-medium text-purple-800 mb-2">Peak Hour</h3>
                <p className="text-3xl font-bold text-purple-900">{peakHour.hourLabel}</p>
                <p className="text-sm text-purple-700">{peakHour.count} tickets</p>
              </div>
            </div>

            {/* Area Chart */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Ticket Volume Throughout the Day</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={hourData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hourLabel" />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
                            <p className="font-semibold text-gray-900">
                              {payload[0].payload.hourLabel}
                            </p>
                            <p className="text-primary-600">
                              {payload[0].value} tickets
                            </p>
                            <p className="text-sm text-gray-500">
                              {payload[0].payload.timeOfDay}
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

            {/* Time of Day Breakdown */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Time of Day Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {timeOfDayData.map((period, index) => {
                  const colors = {
                    Night: { bg: 'bg-indigo-100', text: 'text-indigo-900', border: 'border-indigo-300' },
                    Morning: { bg: 'bg-yellow-100', text: 'text-yellow-900', border: 'border-yellow-300' },
                    Afternoon: { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-300' },
                    Evening: { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300' },
                  };
                  const color = colors[period.name] || colors.Morning;

                  return (
                    <div
                      key={index}
                      className={`${color.bg} ${color.border} border-2 rounded-lg p-6 text-center`}
                    >
                      <h4 className={`text-sm font-medium ${color.text} mb-2`}>{period.name}</h4>
                      <p className={`text-2xl font-bold ${color.text}`}>{period.count}</p>
                      <p className={`text-sm ${color.text} opacity-75 mt-1`}>{period.percentage}%</p>
                    </div>
                  );
                })}
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
};

export default HourOfDayDashboard;
