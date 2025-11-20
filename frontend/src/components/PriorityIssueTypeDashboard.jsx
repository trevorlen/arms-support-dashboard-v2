import React, { useState, useMemo } from 'react';
import { ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Info } from 'lucide-react';

const COLORS = ['#dc3545', '#fd7e14', '#ffc107', '#28a745'];
const ISSUE_COLORS = ['#dc3545', '#17a2b8', '#6c757d'];

const PriorityIssueTypeDashboard = ({ tickets, summary, loading, onTicketClick, dateRange }) => {
  const [sortColumn, setSortColumn] = useState('status');
  const [sortDirection, setSortDirection] = useState('asc');
  const [issueFilter, setIssueFilter] = useState('system'); // 'system' or 'user'
  const [statusFilter, setStatusFilter] = useState('open'); // 'open' or 'all'

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  // Helper functions
  const getStatusColor = (status) => {
    const colors = {
      Open: 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-purple-100 text-purple-800',
      'In Backlog': 'bg-indigo-100 text-indigo-800',
      'Review Response': 'bg-cyan-100 text-cyan-800',
      Pending: 'bg-yellow-100 text-yellow-800',
      'Awaiting Information': 'bg-orange-100 text-orange-800',
      'Waiting on Third Party': 'bg-amber-100 text-amber-800',
      Resolved: 'bg-green-100 text-green-800',
      Closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const isUnresolved = (status) => {
    return status !== 'Resolved' && status !== 'Closed';
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline opacity-30" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1 inline" />
      : <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

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

  // Priority breakdown - always show all 4 priorities
  const priorityCounts = {
    'Urgent': 0,
    'High': 0,
    'Medium': 0,
    'Low': 0
  };

  tickets.data.forEach((ticket) => {
    const priority = ticket.priority_name || ticket.priority || 'Unknown';
    if (priorityCounts.hasOwnProperty(priority)) {
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
    }
  });

  const priorityData = [
    { name: 'Urgent', count: priorityCounts['Urgent'] },
    { name: 'High', count: priorityCounts['High'] },
    { name: 'Medium', count: priorityCounts['Medium'] },
    { name: 'Low', count: priorityCounts['Low'] }
  ];

  const totalPriority = priorityData.reduce((sum, item) => sum + item.count, 0);

  // Calculate static System Issues and User Issues counts
  // Include ALL unresolved issues + resolved issues created within the date range (matching table logic)
  const dateRangeStart = dateRange?.start_date ? new Date(dateRange.start_date) : null;
  const dateRangeEnd = dateRange?.end_date ? new Date(dateRange.end_date) : null;

  const systemIssuesCount = useMemo(() => {
    return tickets.data.filter(ticket => {
      const issueType = ticket.issue_type || ticket.custom_fields?.cf_issue_type || '';
      const status = ticket.status_name || ticket.status;
      const createdDate = ticket.created_at ? new Date(ticket.created_at) : null;

      // Must be System Issue type
      if (issueType !== 'System Issue') return false;

      // Include ALL unresolved issues (regardless of date)
      if (isUnresolved(status)) {
        return true;
      }

      // Include resolved/closed issues created within the selected date range
      if (dateRangeStart && createdDate >= dateRangeStart) {
        return true;
      }

      return false;
    }).length;
  }, [tickets.data, dateRangeStart, dateRangeEnd]);

  const userIssuesCount = useMemo(() => {
    return tickets.data.filter(ticket => {
      const issueType = ticket.issue_type || ticket.custom_fields?.cf_issue_type || '';
      const status = ticket.status_name || ticket.status;
      const createdDate = ticket.created_at ? new Date(ticket.created_at) : null;

      // Must be User Issue type
      if (issueType !== 'User Issue') return false;

      // Include ALL unresolved issues (regardless of date)
      if (isUnresolved(status)) {
        return true;
      }

      // Include resolved/closed issues created within the selected date range
      if (dateRangeStart && createdDate >= dateRangeStart) {
        return true;
      }

      return false;
    }).length;
  }, [tickets.data, dateRangeStart, dateRangeEnd]);

  // Dev assistance needed - count tickets with cf_dev_assistance_needed === "Yes" within date range
  const devAssistanceNeeded = tickets.data.filter(ticket => {
    const createdDate = ticket.created_at ? new Date(ticket.created_at) : null;

    // Check if dev assistance needed field is "Yes"
    const devAssist = ticket.cf_dev_assistance_needed || ticket.custom_fields?.cf_dev_assistance_needed;
    if (devAssist !== 'Yes' && devAssist !== true) return false;

    // Only count tickets created within the date range
    if (dateRangeStart && dateRangeEnd && createdDate) {
      return createdDate >= dateRangeStart && createdDate <= dateRangeEnd;
    }

    return false;
  }).length;

  // Filter tickets based on issue type toggle and status filter
  const filteredTickets = useMemo(() => {
    return tickets.data.filter(ticket => {
      const issueType = ticket.issue_type || ticket.custom_fields?.cf_issue_type || '';
      const status = ticket.status_name || ticket.status;
      const createdDate = new Date(ticket.created_at);

      // Filter by selected issue type
      const targetIssueType = issueFilter === 'system' ? 'System Issue' : 'User Issue';
      if (issueType !== targetIssueType) {
        return false;
      }

      // Filter by status (open/all)
      if (statusFilter === 'open' && !isUnresolved(status)) {
        return false;
      }

      // Include ALL unresolved issues that were created within or before the date range
      if (isUnresolved(status)) {
        // Only show unresolved tickets if they were created on or before the end date
        if (dateRangeEnd && createdDate <= dateRangeEnd) {
          return true;
        }
        // If no date range, show all unresolved
        if (!dateRangeEnd) {
          return true;
        }
        return false;
      }

      // Include resolved/closed issues created within the selected date range
      if (dateRangeStart && createdDate >= dateRangeStart && dateRangeEnd && createdDate <= dateRangeEnd) {
        return true;
      }

      return false;
    });
  }, [tickets.data, dateRange, issueFilter, statusFilter]);

  // Sort filtered tickets - ALWAYS put unresolved tickets first
  const sortedTickets = useMemo(() => {
    const ticketsToSort = [...filteredTickets];

    return ticketsToSort.sort((a, b) => {
      const aStatus = a.status_name || a.status;
      const bStatus = b.status_name || b.status;
      const aResolved = !isUnresolved(aStatus);
      const bResolved = !isUnresolved(bStatus);

      // ALWAYS prioritize unresolved tickets first, regardless of sort column
      if (aResolved !== bResolved) {
        return aResolved ? 1 : -1; // Unresolved always comes first
      }

      // Within the same resolved/unresolved group, apply the selected sort
      let aValue, bValue;

      switch (sortColumn) {
        case 'ticket':
          aValue = Number(a.id);
          bValue = Number(b.id);
          break;
        case 'subject':
          aValue = (a.subject || a.title || '').toLowerCase();
          bValue = (b.subject || b.title || '').toLowerCase();
          break;
        case 'platform':
          aValue = (a.platform || 'Unknown').toLowerCase();
          bValue = (b.platform || 'Unknown').toLowerCase();
          break;
        case 'status':
          aValue = aStatus.toLowerCase();
          bValue = bStatus.toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTickets, sortColumn, sortDirection]);

  // Check if ticket is new (created within date range)
  const isNewTicket = (ticket) => {
    if (!dateRange?.start) return false;
    const createdDate = new Date(ticket.created_at);
    const rangeStart = new Date(dateRange.start);
    return createdDate >= rangeStart;
  };

  return (
    <div className="space-y-6">
      {/* Issue Type Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <span className="mr-2">⚠️</span>
          System vs User Issues
        </h2>

        <>
          {/* Issue Type Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6">
              <h3 className="text-sm font-medium text-red-800 mb-2">System Issues</h3>
              <p className="text-3xl font-bold text-red-900">
                {systemIssuesCount}
              </p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
              <h3 className="text-sm font-medium text-blue-800 mb-2">User Issues</h3>
              <p className="text-3xl font-bold text-blue-900">
                {userIssuesCount}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 relative">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-medium text-green-800">Dev Assistance Needed</h3>
                <div className="group relative">
                  <Info className="w-4 h-4 text-green-600 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-64 z-10">
                    This value is reflective of all ticket types regardless of ticket type
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-3xl font-bold text-green-900">{devAssistanceNeeded}</p>
            </div>
          </div>
        </>
      </div>

      {/* Issues Table with Toggle */}
      {sortedTickets.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <span className="mr-2">📋</span>
                Issues
              </h2>

              {/* Issue Type Toggle */}
              <div className="flex items-center bg-gray-200 rounded-lg p-1 shadow-inner">
                <button
                  onClick={() => setIssueFilter('system')}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    issueFilter === 'system'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  System
                </button>
                <button
                  onClick={() => setIssueFilter('user')}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    issueFilter === 'user'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  User
                </button>
              </div>
            </div>

            {/* Open/All Toggle */}
            <div className="flex items-center bg-gray-200 rounded-lg p-1 shadow-inner">
              <button
                onClick={() => setStatusFilter('open')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  statusFilter === 'open'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-300'
                }`}
              >
                Open
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-300'
                }`}
              >
                All
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('ticket')}
                  >
                    Ticket #
                    <SortIcon column="ticket" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('subject')}
                  >
                    Subject
                    <SortIcon column="subject" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('platform')}
                  >
                    Platform
                    <SortIcon column="platform" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    Status
                    <SortIcon column="status" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('created')}
                  >
                    Created
                    <SortIcon column="created" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTickets.map((ticket) => {
                  const isNew = isNewTicket(ticket);
                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => onTicketClick && onTicketClick(ticket.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://arms.freshdesk.com/a/tickets/${ticket.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            #{ticket.id}
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                          {isNew && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-green-100 text-green-800 rounded border border-green-300">
                              NEW
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-md truncate" title={ticket.subject || ticket.title}>
                          {ticket.subject || ticket.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {ticket.platform || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status_name || ticket.status)}`}>
                          {ticket.status_name || ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriorityIssueTypeDashboard;
