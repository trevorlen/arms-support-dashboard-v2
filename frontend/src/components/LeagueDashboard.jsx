import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ExternalLink, Search, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import DevOpsLink from './DevOpsLink';
import PlatformLogo from './PlatformLogo';
import LeagueLogo from './LeagueLogo';

// Blue, purple, and grey color scheme
const COLORS = ['#3B82F6', '#8B5CF6', '#6366F1', '#60A5FA', '#A78BFA', '#818CF8', '#6B7280', '#9CA3AF'];

// Custom tick component to render league logos on Y-axis
const CustomYAxisTick = ({ x, y, payload }) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-60} y={-20} width={50} height={40}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', height: '100%' }}>
          <LeagueLogo league={payload.value} size="small" />
        </div>
      </foreignObject>
    </g>
  );
};

const LeagueDashboard = ({ tickets, loading, onTicketClick }) => {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null); // For league drill-down
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState('status'); // Default sort by status
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' puts unresolved first
  const [statusFilter, setStatusFilter] = useState('open'); // 'all' or 'open'

  // ARMS Support Product ID for filtering
  const ARMS_PRODUCT_ID = '154000020827';

  const getStatusColor = (status) => {
    const colors = {
      Open: 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-purple-100 text-purple-800',
      Pending: 'bg-yellow-100 text-yellow-800',
      'Awaiting Information': 'bg-orange-100 text-orange-800',
      'Waiting on Third Party': 'bg-amber-100 text-amber-800',
      Resolved: 'bg-green-100 text-green-800',
      Closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Helper to check if ticket is unresolved
  const isUnresolved = (status) => {
    return status !== 'Resolved' && status !== 'Closed';
  };

  // Handle column sorting
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  // Render sort icon for column headers
  const SortIcon = ({ column }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline opacity-30" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1 inline" />
      : <ArrowDown className="w-4 h-4 ml-1 inline" />;
  };

  // Search and pagination controls component
  const SearchAndPaginationControls = () => (
    <div className="space-y-4 mb-4">
      {/* Search Bar and Controls */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ticket # or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter Toggle */}
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

        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>

      {/* Results Info */}
      {searchQuery && (
        <div className="text-sm text-gray-600">
          Found {searchFilteredTickets.length} ticket{searchFilteredTickets.length !== 1 ? 's' : ''} matching "{searchQuery}"
        </div>
      )}
    </div>
  );

  // Pagination controls component
  const PaginationControls = () => (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
      <div className="text-sm text-gray-600">
        {searchFilteredTickets.length > 0 ? (
          <>Showing {startIndex}-{endIndex} of {searchFilteredTickets.length} tickets</>
        ) : (
          <>No tickets found</>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  // Group tickets by platform first (filter by ARMS Support product only)
  const platformLeagueCounts = {};
  tickets?.data?.forEach((ticket) => {
    // Filter by product_id to ensure only ARMS Support tickets
    const matchesProduct = !ticket.product_id || String(ticket.product_id) === ARMS_PRODUCT_ID;
    if (!matchesProduct) return;

    const platform = ticket.platform || 'Unknown';
    const league = ticket.league || 'Unknown';

    if (!platformLeagueCounts[platform]) {
      platformLeagueCounts[platform] = {};
    }

    platformLeagueCounts[platform][league] = (platformLeagueCounts[platform][league] || 0) + 1;
  });

  // Get list of platforms
  const platforms = Object.keys(platformLeagueCounts).sort();

  // Reset page when search query, selected platform, selected league, or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedPlatform, selectedLeague, statusFilter]);

  // Filter tickets by selected platform, league, and product_id
  const platformFilteredTickets = useMemo(() => {
    if (!selectedPlatform || !tickets?.data) return [];

    return tickets.data.filter(t => {
      // Filter by platform
      const matchesPlatform = (t.platform || 'Unknown') === selectedPlatform;

      // Filter by product_id to ensure only ARMS Support tickets
      const matchesProduct = !t.product_id || String(t.product_id) === ARMS_PRODUCT_ID;

      // Filter by selected league if one is selected
      const matchesLeague = !selectedLeague || (t.league || 'Unknown') === selectedLeague;

      return matchesPlatform && matchesProduct && matchesLeague;
    });
  }, [selectedPlatform, selectedLeague, tickets, ARMS_PRODUCT_ID]);

  // Search and status filtered tickets
  const searchFilteredTickets = useMemo(() => {
    let filtered = platformFilteredTickets;

    // Apply status filter
    if (statusFilter === 'open') {
      filtered = filtered.filter(ticket => isUnresolved(ticket.status_name || ticket.status));
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ticket =>
        String(ticket.id).includes(query) ||
        (ticket.subject || ticket.title || '').toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [platformFilteredTickets, searchQuery, statusFilter]);

  // Sort ALL tickets before pagination
  const sortedTickets = useMemo(() => {
    const ticketsToSort = [...searchFilteredTickets];

    return ticketsToSort.sort((a, b) => {
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
        case 'league':
          aValue = (a.league || 'Unknown').toLowerCase();
          bValue = (b.league || 'Unknown').toLowerCase();
          break;
        case 'status':
          // For status, unresolved tickets should come first in 'asc' order
          const aResolved = !isUnresolved(a.status_name || a.status);
          const bResolved = !isUnresolved(b.status_name || b.status);
          if (aResolved !== bResolved) {
            return sortDirection === 'asc' ? (aResolved ? 1 : -1) : (aResolved ? -1 : 1);
          }
          // If both are same resolved/unresolved state, sort alphabetically
          aValue = (a.status_name || a.status || '').toLowerCase();
          bValue = (b.status_name || b.status || '').toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      // Handle comparison
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [searchFilteredTickets, sortColumn, sortDirection]);

  // Paginate sorted results
  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedTickets.slice(startIndex, endIndex);
  }, [sortedTickets, currentPage, pageSize]);

  const totalPages = Math.ceil(searchFilteredTickets.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(startIndex + pageSize - 1, searchFilteredTickets.length);

  // Use platformFilteredTickets for counts (not search filtered)
  const filteredTickets = platformFilteredTickets;

  // Group tickets by league (filtered by platform)
  const leagueCounts = {};
  filteredTickets?.forEach((ticket) => {
    const league = ticket.league || 'Unknown';
    leagueCounts[league] = (leagueCounts[league] || 0) + 1;
  });

  const leagueData = Object.entries(leagueCounts)
    .map(([name, count]) => ({
      name,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const total = leagueData.reduce((sum, item) => sum + item.count, 0);

  // Check if there's only one unique league in the filtered results
  const hasOnlyOneLeague = leagueData.length === 1;

  // Group tickets by league → team for drill-down view
  const leagueTeamData = useMemo(() => {
    if (!selectedLeague || !platformFilteredTickets) return null;

    console.log('Computing leagueTeamData for league:', selectedLeague);
    console.log('platformFilteredTickets count:', platformFilteredTickets.length);

    const teamCounts = {};
    platformFilteredTickets.forEach((ticket) => {
      const team = ticket.cf_team446161 || ticket.custom_fields?.cf_team446161 || 'Unknown';
      teamCounts[team] = (teamCounts[team] || 0) + 1;
    });

    console.log('Team counts:', teamCounts);

    const result = Object.entries(teamCounts)
      .map(([name, count]) => ({
        name,
        count
      }))
      .sort((a, b) => b.count - a.count);

    console.log('leagueTeamData result:', result);
    return result;
  }, [selectedLeague, platformFilteredTickets]);

  const teamTotal = leagueTeamData ? leagueTeamData.reduce((sum, item) => sum + item.count, 0) : 0;

  // Get breakdown by status for each league (filtered)
  const leagueStatusBreakdown = {};
  filteredTickets?.forEach((ticket) => {
    const league = ticket.league || 'Unknown';
    const status = ticket.status_name || 'Unknown';

    if (!leagueStatusBreakdown[league]) {
      leagueStatusBreakdown[league] = {};
    }
    leagueStatusBreakdown[league][status] =
      (leagueStatusBreakdown[league][status] || 0) + 1;
  });

  // Calculate total tickets per platform
  const platformTotals = {};
  platforms.forEach(platform => {
    platformTotals[platform] = Object.values(platformLeagueCounts[platform]).reduce((sum, count) => sum + count, 0);
  });

  return (
    <div className="space-y-6">
      {/* Platform Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by Platform</h3>
        <div className="flex flex-wrap gap-2">
          {platforms.map((platform, index) => (
            <button
              key={index}
              onClick={() => setSelectedPlatform(platform)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                selectedPlatform === platform
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <PlatformLogo platform={platform} size="small" />
            </button>
          ))}
        </div>
      </div>

      {!selectedPlatform ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12 text-gray-500">
            <span className="text-4xl mb-4 block">🏆</span>
            <p className="text-lg">Please select a platform to view league data</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-2">🏆</span>
            Tickets by League
            {selectedPlatform && (
              <span className="ml-2 flex items-center gap-2">
                - <PlatformLogo platform={selectedPlatform} size="medium" />
              </span>
            )}
          </h2>

          {leagueData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No league data available
            </div>
          ) : selectedLeague ? (
            <>
              {/* League Drill-Down: Teams View */}
              <button
                onClick={() => setSelectedLeague(null)}
                className="text-primary-600 hover:text-primary-800 font-medium flex items-center mb-6"
              >
                ← Back to leagues
              </button>

              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {selectedLeague} - Teams Breakdown
              </h3>

              {/* Team Breakdown - Bar Chart */}
              {leagueTeamData && leagueTeamData.length > 0 ? (
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-700 mb-4">Teams ({leagueTeamData.length})</h4>
                  <ResponsiveContainer width="100%" height={Math.max(300, leagueTeamData.length * 50)}>
                    <BarChart data={leagueTeamData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const teamTotal = leagueTeamData.reduce((sum, t) => sum + t.count, 0);
                            const percentage = ((payload[0].value / teamTotal) * 100).toFixed(1);
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
                      <Bar dataKey="count" name="Tickets" radius={[0, 8, 8, 0]}>
                        {leagueTeamData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-800">No team data available for {selectedLeague}</p>
                </div>
              )}

              {/* Tickets Table for Selected League */}
              {onTicketClick && filteredTickets && filteredTickets.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">
                    Tickets ({filteredTickets.length})
                  </h3>
                  <SearchAndPaginationControls />
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Team
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            DevOps Link
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedTickets.map((ticket) => {
                          const team = ticket.cf_team446161 || ticket.custom_fields?.cf_team446161 || 'Unknown';
                          return (
                            <tr
                              key={ticket.id}
                              className="hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => onTicketClick(ticket.id)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
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
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                <div className="max-w-md truncate" title={ticket.subject || ticket.title}>
                                  {ticket.subject || ticket.title}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {team}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status_name || ticket.status)}`}>
                                  {ticket.status_name || ticket.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {new Date(ticket.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <DevOpsLink ticket={ticket} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <PaginationControls />
                </div>
              )}
            </>
          ) : hasOnlyOneLeague ? (
            <>
              {/* Show only Recent Tickets when there's only one league */}
              {onTicketClick && filteredTickets && filteredTickets.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">
                    {leagueData[0].name} - Recent Tickets ({filteredTickets.length})
                  </h3>
                  <SearchAndPaginationControls />
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            DevOps Link
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedTickets.map((ticket) => (
                          <tr
                            key={ticket.id}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => onTicketClick(ticket.id)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                              #{ticket.id}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="max-w-md truncate">
                                {ticket.title || ticket.subject}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status_name || ticket.status)}`}>
                                {ticket.status_name || ticket.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <DevOpsLink ticket={ticket} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <PaginationControls />
                </div>
              )}
            </>
          ) : (
          <>
            {/* League Bar Chart - Clickable */}
            <div className="mb-8">
              <p className="text-sm text-gray-600 mb-4">Click on a league to drill down into teams</p>
              <div className="cursor-pointer">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={leagueData} layout="vertical" onClick={(data) => {
                    if (data && data.activePayload && data.activePayload.length > 0) {
                      setSelectedLeague(data.activePayload[0].payload.name);
                    }
                  }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={70} tick={<CustomYAxisTick />} />
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
                              <p className="text-xs text-gray-500 mt-1">Click to drill down</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" name="Tickets" radius={[0, 8, 8, 0]}>
                      {leagueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Tickets */}
            {onTicketClick && filteredTickets && filteredTickets.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Tickets</h3>
                <SearchAndPaginationControls />
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
                          onClick={() => handleSort('league')}
                        >
                          League
                          <SortIcon column="league" />
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          DevOps Link
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedTickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => onTicketClick(ticket.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                            #{ticket.id}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="max-w-md truncate">
                              {ticket.title || ticket.subject}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {ticket.league || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status_name || ticket.status)}`}>
                              {ticket.status_name || ticket.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <DevOpsLink ticket={ticket} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationControls />
              </div>
            )}
          </>
          )}
        </div>
      )}
    </div>
  );
};

export default LeagueDashboard;
