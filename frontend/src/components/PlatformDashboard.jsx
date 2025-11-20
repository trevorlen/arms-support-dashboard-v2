import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import PlatformLogo from './PlatformLogo';

// Blue, purple, and grey color scheme
const COLORS = ['#3B82F6', '#8B5CF6', '#6366F1', '#60A5FA', '#A78BFA', '#818CF8', '#6B7280', '#9CA3AF'];

// Custom tick component to render platform logos
const CustomXAxisTick = ({ x, y, payload }) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-30} y={0} width={60} height={60}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <PlatformLogo platform={payload.value} size={{ height: '40px', width: 'auto' }} />
        </div>
      </foreignObject>
    </g>
  );
};

const PlatformDashboard = ({ summary, tickets, loading, dateRange }) => {
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

  // Calculate platform counts from tickets (ensures product_id and date filtering is applied)
  const platformCounts = {};
  tickets?.data?.forEach((ticket) => {
    // Filter by product_id to ensure only ARMS Support tickets
    const matchesProduct = !ticket.product_id || String(ticket.product_id) === ARMS_PRODUCT_ID;
    if (!matchesProduct) return;

    // Filter by date range
    if (startDate && endDate) {
      const ticketDate = new Date(ticket.created_at);
      if (ticketDate < startDate || ticketDate > endDate) return;
    }

    const platform = ticket.platform || 'Unknown';
    platformCounts[platform] = (platformCounts[platform] || 0) + 1;
  });

  const platformData = Object.entries(platformCounts).map(([name, count]) => ({
    name: name || 'Unknown',
    count,
  })).sort((a, b) => b.count - a.count);

  const total = platformData.reduce((sum, item) => sum + item.count, 0);

  // Calculate ticket type breakdown per platform
  const getTicketTypeBreakdown = (platformName) => {
    if (!tickets?.data) return {};

    const platformTickets = tickets.data.filter(ticket => {
      // Filter by product_id to ensure only ARMS Support tickets
      const matchesProduct = !ticket.product_id || String(ticket.product_id) === ARMS_PRODUCT_ID;
      const matchesPlatform = (ticket.platform || 'Unknown') === platformName;

      // Filter by date range
      if (startDate && endDate) {
        const ticketDate = new Date(ticket.created_at);
        if (ticketDate < startDate || ticketDate > endDate) return false;
      }

      return matchesProduct && matchesPlatform;
    });

    const breakdown = {};
    platformTickets.forEach(ticket => {
      const ticketType = ticket.custom_ticket_type || 'Unknown';
      breakdown[ticketType] = (breakdown[ticketType] || 0) + 1;
    });

    return breakdown;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span className="mr-2">📱</span>
          Tickets by Platform
        </h2>

        {platformData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No platform data available
          </div>
        ) : (
          <>
            {/* Bar Chart */}
            <div className="mb-8">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={platformData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={<CustomXAxisTick />} height={60} />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const platformName = payload[0].payload.name;
                        const ticketCount = payload[0].value;
                        const percentage = ((ticketCount / total) * 100).toFixed(1);
                        const ticketTypeBreakdown = getTicketTypeBreakdown(platformName);
                        const sortedTypes = Object.entries(ticketTypeBreakdown)
                          .sort((a, b) => b[1] - a[1]);

                        return (
                          <div className="bg-white p-4 border border-gray-200 rounded shadow-lg max-w-sm">
                            <p className="font-semibold text-gray-900 mb-2">{platformName}</p>
                            <p className="text-primary-600 mb-3">{ticketCount} tickets ({percentage}%)</p>

                            {sortedTypes.length > 0 && (
                              <div className="border-t border-gray-200 pt-2">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Breakdown by Type:</p>
                                <div className="space-y-1">
                                  {sortedTypes.map(([type, count]) => (
                                    <div key={type} className="flex justify-between text-xs">
                                      <span className="text-gray-600">{type}:</span>
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
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlatformDashboard;
