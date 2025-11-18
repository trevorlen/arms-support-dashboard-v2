import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

// Blue, purple, and grey color scheme
const COLORS = ['#3B82F6', '#8B5CF6', '#6366F1', '#60A5FA', '#A78BFA', '#818CF8', '#6B7280', '#9CA3AF'];

const PlatformDashboard = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  const platformData = Object.entries(summary?.by_platform || {}).map(([name, count]) => ({
    name: name || 'Unknown',
    count,
  })).sort((a, b) => b.count - a.count);

  const total = platformData.reduce((sum, item) => sum + item.count, 0);

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
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const percentage = ((payload[0].value / total) * 100).toFixed(1);
                        return (
                          <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
                            <p className="font-semibold text-gray-900">{payload[0].payload.name}</p>
                            <p className="text-primary-600">{payload[0].value} tickets ({percentage}%)</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="count" name="Tickets" radius={[8, 8, 0, 0]}>
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Platform Table */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Platform Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Platform
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tickets
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Percentage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Visual
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {platformData.map((platform, index) => {
                      const percentage = ((platform.count / total) * 100).toFixed(1);
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div
                                className="w-3 h-3 rounded-full mr-3"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              ></div>
                              <span className="text-sm font-medium text-gray-900">{platform.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                            {platform.count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {percentage}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: COLORS[index % COLORS.length],
                                }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PlatformDashboard;
