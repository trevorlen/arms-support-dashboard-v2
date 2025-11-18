import React from 'react';
import { ExternalLink, GitBranch } from 'lucide-react';

const DevOpsDashboard = ({ devopsTickets, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  // Status badge colors
  const getStatusColor = (status) => {
    const statusColors = {
      'New': 'bg-blue-100 text-blue-800',
      'Active': 'bg-green-100 text-green-800',
      'Resolved': 'bg-purple-100 text-purple-800',
      'Closed': 'bg-gray-100 text-gray-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Done': 'bg-green-100 text-green-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  // Work item type badge colors
  const getWorkItemTypeColor = (type) => {
    const typeColors = {
      'Bug': 'bg-red-100 text-red-800',
      'Task': 'bg-blue-100 text-blue-800',
      'User Story': 'bg-purple-100 text-purple-800',
      'Feature': 'bg-indigo-100 text-indigo-800',
      'Issue': 'bg-orange-100 text-orange-800',
    };
    return typeColors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <GitBranch className="mr-2 w-6 h-6" />
            DevOps Tickets
          </h2>
          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold">{devopsTickets?.length || 0}</span> tickets
          </div>
        </div>

        {!devopsTickets || devopsTickets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <GitBranch className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No DevOps tickets available</p>
            <p className="text-sm mt-2">DevOps integration may not be configured yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DevOps Ticket ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Work Item Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Linked FD Ticket
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {devopsTickets.map((ticket, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <a
                          href={ticket.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          {ticket.id}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(ticket.createdDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                      <div className="truncate" title={ticket.title}>
                        {ticket.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getWorkItemTypeColor(ticket.workItemType)}`}>
                        {ticket.workItemType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {ticket.linkedFDTicket ? (
                        <a
                          href={ticket.linkedFDTicket.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          #{ticket.linkedFDTicket.id}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevOpsDashboard;
