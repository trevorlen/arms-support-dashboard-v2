import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ExternalLink, Search, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

// Blue, purple, and grey color scheme
const COLORS = ['#3B82F6', '#8B5CF6', '#6366F1', '#60A5FA', '#A78BFA', '#818CF8', '#6B7280', '#9CA3AF'];

const LeagueDashboard = ({ tickets, loading, onTicketClick }) => {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState('status'); // Default sort by status
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' puts unresolved first

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
      {/* Search Bar */}
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

  // Group tickets by platform first
  const platformLeagueCounts = {};
  tickets?.data?.forEach((ticket) => {
    const platform = ticket.platform || 'Unknown';
    const league = ticket.league || 'Unknown';
    
    if (!platformLeagueCounts[platform]) {
      platformLeagueCounts[platform] = {};
    }
    
    platformLeagueCounts[platform][league] = (platformLeagueCounts[platform][league] || 0) + 1;
  });

  // Get list of platforms
  const platforms = Object.keys(platformLeagueCounts).sort();

  // Reset page when search query or selected platform changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedPlatform]);

  // Filter tickets by selected platform and product_id
  const platformFilteredTickets = useMemo(() => {
    if (!selectedPlatform || !tickets?.data) return [];

    return tickets.data.filter(t => {
      // Filter by platform
      const matchesPlatform = (t.platform || 'Unknown') === selectedPlatform;

      // Filter by product_id to ensure only ARMS Support tickets
      const matchesProduct = !t.product_id || String(t.product_id) === ARMS_PRODUCT_ID;

      return matchesPlatform && matchesProduct;
    });
  }, [selectedPlatform, tickets, ARMS_PRODUCT_ID]);

  // Search filtered tickets
  const searchFilteredTickets = useMemo(() => {
    if (!searchQuery) return platformFilteredTickets;

    const query = searchQuery.toLowerCase();
    return platformFilteredTickets.filter(ticket =>
      String(ticket.id).includes(query) ||
      (ticket.subject || ticket.title || '').toLowerCase().includes(query)
    );
  }, [platformFilteredTickets, searchQuery]);

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
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Filter by Platform</h3>
        <div className="flex flex-wrap gap-2">
          {platforms.map((platform, index) => (
            <button
              key={index}
              onClick={() => setSelectedPlatform(platform)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPlatform === platform
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {platform} ({platformTotals[platform]})
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
              <span className="ml-2 text-lg font-normal text-gray-600">
                ({selectedPlatform})
              </span>
            )}
          </h2>

          {leagueData.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No league data available
            </div>
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
                            Actions
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
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTicketClick(ticket.id);
                                }}
                                className="text-primary-600 hover:text-primary-800 flex items-center space-x-1"
                              >
                                <ExternalLink className="w-4 h-4" />
                                <span>View</span>
                              </button>
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
            {/* Bar Chart */}
            <div className="mb-8">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={leagueData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
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
                  <Bar dataKey="count" name="Tickets" radius={[0, 8, 8, 0]}>
                    {leagueData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* League Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {leagueData.map((league, index) => {
                const percentage = ((league.count / total) * 100).toFixed(1);
                const statusBreakdown = leagueStatusBreakdown[league.name] || {};

                return (
                  <div
                    key={index}
                    className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow hover:shadow-lg transition-shadow p-6 border-l-4"
                    style={{ borderLeftColor: COLORS[index % COLORS.length] }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900">{league.name}</h3>
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      >
                        {league.count}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{percentage}% of total tickets</p>

                    {/* Status mini breakdown */}
                    <div className="space-y-1">
                      {Object.entries(statusBreakdown)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([status, count]) => (
                          <div key={status} className="flex justify-between text-sm">
                            <span className="text-gray-600">{status}:</span>
                            <span className="font-semibold text-gray-900">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
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
                          Actions
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTicketClick(ticket.id);
                              }}
                              className="text-primary-600 hover:text-primary-800 flex items-center space-x-1"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationControls />
              </div>
            )}

            {/* League Table */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">League Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        League
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tickets
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Percentage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Top Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leagueData.map((league, index) => {
                      const percentage = ((league.count / total) * 100).toFixed(1);
                      const statusBreakdown = leagueStatusBreakdown[league.name] || {};
                      const topStatus = Object.entries(statusBreakdown).sort(
                        (a, b) => b[1] - a[1]
                      )[0];

                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div
                                className="w-3 h-3 rounded-full mr-3"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              ></div>
                              <span className="text-sm font-medium text-gray-900">{league.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                            {league.count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {percentage}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {topStatus ? `${topStatus[0]} (${topStatus[1]})` : 'N/A'}
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
      )}
    </div>
  );
};

export default LeagueDashboard;
