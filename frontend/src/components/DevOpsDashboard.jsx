import React, { useState, useMemo } from 'react';
import { ExternalLink, GitBranch, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

const DevOpsDashboard = ({ devopsTickets, loading }) => {
  const [sortColumn, setSortColumn] = useState('created_date');
  const [sortDirection, setSortDirection] = useState('desc');
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
      'Product Backlog Item': 'bg-purple-100 text-purple-800',
      'Feature': 'bg-indigo-100 text-indigo-800',
      'Issue': 'bg-orange-100 text-orange-800',
    };
    return typeColors[type] || 'bg-gray-100 text-gray-800';
  };

  // Get Freshdesk domain for ticket links
  const freshdeskDomain = 'arms.freshdesk.com';

  // Handle column sort
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort tickets based on current sort column and direction
  const sortedTickets = useMemo(() => {
    if (!devopsTickets) return [];

    const sorted = [...devopsTickets].sort((a, b) => {
      let aValue, bValue;

      switch (sortColumn) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'created_date':
          aValue = new Date(a.created_date).getTime();
          bValue = new Date(b.created_date).getTime();
          break;
        case 'title':
          aValue = (a.title || '').toLowerCase();
          bValue = (b.title || '').toLowerCase();
          break;
        case 'work_item_type':
          aValue = (a.work_item_type || '').toLowerCase();
          bValue = (b.work_item_type || '').toLowerCase();
          break;
        case 'state':
          aValue = (a.state || '').toLowerCase();
          bValue = (b.state || '').toLowerCase();
          break;
        case 'assigned_to':
          aValue = (a.assigned_to || 'Unassigned').toLowerCase();
          bValue = (b.assigned_to || 'Unassigned').toLowerCase();
          break;
        case 'freshdesk_ticket_id':
          aValue = a.freshdesk_ticket_id || '';
          bValue = b.freshdesk_ticket_id || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [devopsTickets, sortColumn, sortDirection]);

  // Render sort icon
  const SortIcon = ({ column }) => {
    if (sortColumn !== column) {
      return <ChevronsUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 ml-1 text-primary-600" />
    ) : (
      <ChevronDown className="w-4 h-4 ml-1 text-primary-600" />
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <GitBranch className="mr-2 w-6 h-6" />
            Current DevOps Tickets
          </h2>
          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold">{sortedTickets?.length || 0}</span> tickets
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
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('id')}
                  >
                    <div className="flex items-center">
                      DevOps Ticket ID
                      <SortIcon column="id" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('created_date')}
                  >
                    <div className="flex items-center">
                      Date Created
                      <SortIcon column="created_date" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Title
                      <SortIcon column="title" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('work_item_type')}
                  >
                    <div className="flex items-center">
                      Work Item Type
                      <SortIcon column="work_item_type" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('state')}
                  >
                    <div className="flex items-center">
                      Status
                      <SortIcon column="state" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('assigned_to')}
                  >
                    <div className="flex items-center">
                      Assigned To
                      <SortIcon column="assigned_to" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('freshdesk_ticket_id')}
                  >
                    <div className="flex items-center">
                      Linked FD Ticket
                      <SortIcon column="freshdesk_ticket_id" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTickets.map((ticket, index) => (
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
                      {new Date(ticket.created_date).toLocaleDateString('en-US', {
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
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getWorkItemTypeColor(ticket.work_item_type)}`}>
                        {ticket.work_item_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ticket.state)}`}>
                        {ticket.state}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.assigned_to || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {ticket.freshdesk_ticket_id ? (
                        <a
                          href={`https://${freshdeskDomain}/a/tickets/${ticket.freshdesk_ticket_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          #{ticket.freshdesk_ticket_id}
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
