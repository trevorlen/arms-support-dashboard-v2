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

const COLORS = ['#dc3545', '#fd7e14', '#ffc107', '#28a745'];
const ISSUE_COLORS = ['#dc3545', '#17a2b8', '#6c757d'];

const PriorityIssueTypeDashboard = ({ tickets, summary, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  // Check if tickets data exists
  if (!tickets || !tickets.data || !Array.isArray(tickets.data)) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12 text-gray-500">
          No ticket data available
        </div>
      </div>
    );
  }

  // Priority breakdown
  const priorityCounts = {};
  tickets.data.forEach((ticket) => {
    const priority = ticket.priority_name || ticket.priority || 'Unknown';
    priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
  });

  const priorityData = Object.entries(priorityCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      const order = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
      return (order[b.name] || 0) - (order[a.name] || 0);
    });

  const totalPriority = priorityData.reduce((sum, item) => sum + item.count, 0);

  // Issue type breakdown (System Issue vs User Issue)
  const issueTypeCounts = {};
  const issueTypeTags = { system: {}, user: {} };

  tickets.data.forEach((ticket) => {
    const issueType = ticket.issue_type || ticket.cf_issue_type || 'Other';
    issueTypeCounts[issueType] = (issueTypeCounts[issueType] || 0) + 1;

    // Track tags for system and user issues
    const tags = Array.isArray(ticket.tags) ? ticket.tags : [];
    if (issueType === 'System Issue') {
      tags.forEach((tag) => {
        if (tag && typeof tag === 'string') {
          issueTypeTags.system[tag] = (issueTypeTags.system[tag] || 0) + 1;
        }
      });
    } else if (issueType === 'User Issue') {
      tags.forEach((tag) => {
        if (tag && typeof tag === 'string') {
          issueTypeTags.user[tag] = (issueTypeTags.user[tag] || 0) + 1;
        }
      });
    }
  });

  const issueTypeData = Object.entries(issueTypeCounts).map(([name, count]) => ({ name, count }));
  const totalIssues = issueTypeData.reduce((sum, item) => sum + item.count, 0);

  const systemIssueTags = Object.entries(issueTypeTags.system)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const userIssueTags = Object.entries(issueTypeTags.user)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Dev assistance needed
  const devAssistanceNeeded = tickets.data.filter(
    (t) => t.dev_assistance_needed === true || t.cf_dev_assistance_needed === true
  ).length;

  return (
    <div className="space-y-6">
      {/* Priority Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span className="mr-2">🎯</span>
          Priority Breakdown
        </h2>

        {priorityData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No priority data available
          </div>
        ) : (
          <>
            {/* Priority Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {priorityData.map((priority, index) => {
                const percentage = ((priority.count / totalPriority) * 100).toFixed(1);
                const colorMap = {
                  Urgent: { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300' },
                  High: { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-300' },
                  Medium: { bg: 'bg-yellow-100', text: 'text-yellow-900', border: 'border-yellow-300' },
                  Low: { bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-300' },
                };
                const color = colorMap[priority.name] || colorMap.Low;

                return (
                  <div
                    key={index}
                    className={`${color.bg} ${color.border} border-2 rounded-lg p-4 text-center`}
                  >
                    <h4 className={`text-sm font-semibold ${color.text} mb-2`}>{priority.name}</h4>
                    <p className={`text-3xl font-bold ${color.text}`}>{priority.count}</p>
                    <p className={`text-sm ${color.text} opacity-75 mt-1`}>{percentage}%</p>
                  </div>
                );
              })}
            </div>

            {/* Priority Chart */}
            <div className="mb-8">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Tickets">
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Priority Pie Chart */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Priority Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* Issue Type Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span className="mr-2">⚠️</span>
          System vs User Issues
        </h2>

        {issueTypeData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No issue type data available
          </div>
        ) : (
          <>
            {/* Issue Type Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6">
                <h3 className="text-sm font-medium text-red-800 mb-2">System Issues</h3>
                <p className="text-3xl font-bold text-red-900">
                  {issueTypeCounts['System Issue'] || 0}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                <h3 className="text-sm font-medium text-blue-800 mb-2">User Issues</h3>
                <p className="text-3xl font-bold text-blue-900">
                  {issueTypeCounts['User Issue'] || 0}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                <h3 className="text-sm font-medium text-green-800 mb-2">Dev Assistance Needed</h3>
                <p className="text-3xl font-bold text-green-900">{devAssistanceNeeded}</p>
              </div>
            </div>

            {/* Issue Type Chart */}
            <div className="mb-8">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={issueTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" name="Tickets">
                    {issueTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ISSUE_COLORS[index % ISSUE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* System Issue Tags */}
      {systemIssueTags.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-2">🏷️</span>
            System Issue Tags
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {systemIssueTags.map((tag, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border-2 border-red-200"
              >
                <h4 className="text-sm font-medium text-red-800 mb-2 truncate" title={tag.name}>
                  {tag.name}
                </h4>
                <p className="text-2xl font-bold text-red-900">{tag.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Issue Tags */}
      {userIssueTags.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-2">🏷️</span>
            User Issue Tags
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {userIssueTags.map((tag, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-200"
              >
                <h4 className="text-sm font-medium text-blue-800 mb-2 truncate" title={tag.name}>
                  {tag.name}
                </h4>
                <p className="text-2xl font-bold text-blue-900">{tag.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PriorityIssueTypeDashboard;
