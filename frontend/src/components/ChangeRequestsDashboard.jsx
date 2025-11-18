import React, { useState, useEffect } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { getTickets } from '../services/api';

const ChangeRequestsDashboard = ({ loading: initialLoading }) => {
  const [changeRequests, setChangeRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchChangeRequests();
  }, []);

  const fetchChangeRequests = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all tickets from last 365 days to get comprehensive change request data
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const ARMS_GROUP_ID = '154000130280';

      const response = await getTickets({
        start_date: oneYearAgo.toISOString(),
        limit: 10000,
        group_id: ARMS_GROUP_ID,
      });

      // Filter for Change Request tickets only
      const changeRequestTickets = response.data?.filter(
        (ticket) => ticket.custom_ticket_type === 'Change Request'
      ) || [];

      // Sort by created date (newest first)
      changeRequestTickets.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setChangeRequests(changeRequestTickets);
    } catch (err) {
      console.error('Error fetching change requests:', err);
      setError(err.message || 'Failed to load change requests');
    } finally {
      setLoading(false);
    }
  };

  if (loading || initialLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-semibold mb-2">Error Loading Change Requests</p>
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={fetchChangeRequests}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="mr-2 w-6 h-6" />
            Change Requests
          </h2>
          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold">{changeRequests.length}</span> requests
          </div>
        </div>

        {changeRequests.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No Change Requests found</p>
            <p className="text-sm mt-2">There are no Change Request tickets in the system</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requester
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {changeRequests.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(ticket.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {ticket.platform || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.requester?.name || ticket.requester?.email || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                      <div className="truncate" title={ticket.subject || ticket.description_text}>
                        {ticket.subject || ticket.description_text || 'No description'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ticket.status_name === 'Closed' || ticket.status_name === 'Resolved'
                          ? 'bg-green-100 text-green-800'
                          : ticket.status_name === 'Open' || ticket.status_name === 'Pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.status_name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a
                        href={ticket.freshdesk_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View
                      </a>
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

export default ChangeRequestsDashboard;
