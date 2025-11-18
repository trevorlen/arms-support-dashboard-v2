import React from 'react';
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

const COLORS = ['#667eea', '#dc3545', '#28a745', '#17a2b8', '#fd7e14', '#6f42c1', '#ffc107', '#6c757d'];

const TicketTypesDashboard = ({ tickets, summary, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  // Group tickets by type
  const typeCounts = {};
  const typeResolutionTimes = {};
  
  tickets?.data?.forEach((ticket) => {
    const type = ticket.ticket_type || ticket.type || 'Unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
    
    // Calculate resolution time if available
    if (ticket.resolution_time) {
      if (!typeResolutionTimes[type]) {
        typeResolutionTimes[type] = [];
      }
      typeResolutionTimes[type].push(ticket.resolution_time);
    }
  });

  const typeData = Object.entries(typeCounts)
    .map(([name, count]) => {
      // Calculate average resolution time
      let avgResolutionTime = 0;
      if (typeResolutionTimes[name] && typeResolutionTimes[name].length > 0) {
        const sum = typeResolutionTimes[name].reduce((a, b) => a + b, 0);
        avgResolutionTime = sum / typeResolutionTimes[name].length;
      }

      return {
        name,
        count,
        avgResolutionHours: avgResolutionTime > 0 ? (avgResolutionTime / 3600).toFixed(1) : 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  const total = typeData.reduce((sum, item) => sum + item.count, 0);

  // System Access Requests breakdown
  const systemAccessTypes = {};
  tickets?.data?.forEach((ticket) => {
    const type = ticket.ticket_type || ticket.type || '';
    if (type.toLowerCase().includes('system access') || type.toLowerCase().includes('access')) {
      const subType = ticket.description || ticket.subject || 'Other';
      // Extract common access request types from description
      if (subType.toLowerCase().includes('new user')) {
        systemAccessTypes['New User'] = (systemAccessTypes['New User'] || 0) + 1;
      } else if (subType.toLowerCase().includes('transfer')) {
        systemAccessTypes['Transfer Device'] = (systemAccessTypes['Transfer Device'] || 0) + 1;
      } else if (subType.toLowerCase().includes('permission')) {
        systemAccessTypes['Permission Change'] = (systemAccessTypes['Permission Change'] || 0) + 1;
      } else if (subType.toLowerCase().includes('remove')) {
        systemAccessTypes['Remove User'] = (systemAccessTypes['Remove User'] || 0) + 1;
      } else if (subType.toLowerCase().includes('password')) {
        systemAccessTypes['Password Reset'] = (systemAccessTypes['Password Reset'] || 0) + 1;
      } else {
        systemAccessTypes['Other'] = (systemAccessTypes['Other'] || 0) + 1;
      }
    }
  });

  const systemAccessData = Object.entries(systemAccessTypes)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* Main Ticket Types */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span className="mr-2">📋</span>
          Ticket Types Overview
        </h2>

        {typeData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No ticket type data available
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Total Types</h3>
                <p className="text-3xl font-bold text-blue-900">{typeData.length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                <h3 className="text-sm font-medium text-green-800 mb-2">Most Common</h3>
                <p className="text-xl font-bold text-green-900">{typeData[0]?.name || 'N/A'}</p>
                <p className="text-sm text-green-700">{typeData[0]?.count || 0} tickets</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                <h3 className="text-sm font-medium text-purple-800 mb-2">Total Tickets</h3>
                <p className="text-3xl font-bold text-purple-900">{total}</p>
              </div>
            </div>

            {/* Horizontal Bar Chart */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Ticket Type Distribution</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
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
                  <Legend />
                  <Bar dataKey="count" name="Tickets">
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Type Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Resolution Time Chart */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                Average Resolution Time by Type (Hours)
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={typeData.filter((t) => t.avgResolutionHours > 0)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" label={{ value: 'Hours', position: 'insideBottom', offset: -5 }} />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
                            <p className="font-semibold text-gray-900">{payload[0].payload.name}</p>
                            <p className="text-primary-600">
                              Avg: {payload[0].value} hours
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="avgResolutionHours" name="Avg Hours" fill="#667eea" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Type Table */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Type Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Percentage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Resolution (hrs)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Visual
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {typeData.map((type, index) => {
                      const percentage = ((type.count / total) * 100).toFixed(1);
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div
                                className="w-3 h-3 rounded-full mr-3"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              ></div>
                              <span className="text-sm font-medium text-gray-900">{type.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                            {type.count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {percentage}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {type.avgResolutionHours > 0 ? type.avgResolutionHours : 'N/A'}
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

      {/* System Access Requests Breakdown */}
      {systemAccessData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-2">🔐</span>
            System Access Requests
          </h2>

          <div className="mb-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={systemAccessData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="count" name="Requests" fill="#667eea" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {systemAccessData.map((item, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200"
              >
                <h4 className="text-sm font-medium text-gray-700 mb-2">{item.name}</h4>
                <p className="text-2xl font-bold text-gray-900">{item.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketTypesDashboard;
