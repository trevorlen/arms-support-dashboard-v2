import React, { useEffect, useState } from 'react';
import { X, Clock, User, Tag, Calendar, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { getTicket } from '../services/api';
import TicketTimeline from './TicketTimeline';
import DevOpsLink from './DevOpsLink';

const TicketDetailModal = ({ ticketId, onClose }) => {
  const [ticket, setTicket] = useState(null);
  const [requester, setRequester] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTicket = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getTicket(ticketId);
        // Response includes ticket, requester, and conversations
        setTicket(response.ticket || response.data || response);
        setRequester(response.requester || null);
      } catch (err) {
        console.error('Error fetching ticket:', err);
        setError(err.message || 'Failed to load ticket details');
      } finally {
        setLoading(false);
      }
    };

    if (ticketId) {
      fetchTicket();
    }
  }, [ticketId]);

  // Close on Esc key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Urgent: 'bg-red-100 text-red-800 border-red-300',
      High: 'bg-orange-100 text-orange-800 border-orange-300',
      Medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      Low: 'bg-green-100 text-green-800 border-green-300',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusColor = (status) => {
    const colors = {
      Open: 'bg-blue-100 text-blue-800 border-blue-200',
      'In Progress': 'bg-purple-100 text-purple-800 border-purple-200',
      Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Awaiting Information': 'bg-orange-100 text-orange-800 border-orange-200',
      'Waiting on Third Party': 'bg-amber-100 text-amber-800 border-amber-200',
      Resolved: 'bg-green-100 text-green-800 border-green-200',
      Closed: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (!ticketId) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-white">
            <h2 className="text-xl font-bold">Ticket #{ticketId}</h2>
            {ticket && (
              <span className="text-primary-100 text-sm">
                {ticket.title || ticket.subject}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-800 font-semibold mb-2">Error Loading Ticket</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          ) : ticket ? (
            <div className="space-y-6">
              {/* Badge Row: Platform, Priority, Tags, Status (right-aligned) */}
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center">
                  {/* Platform */}
                  {ticket.platform && (
                    <span className="px-4 py-2 rounded-lg bg-blue-100 text-blue-800 font-semibold text-sm border border-blue-200">
                      {ticket.platform}
                    </span>
                  )}

                  {/* Priority */}
                  <span
                    className={`px-4 py-2 rounded-lg font-semibold text-sm border-2 ${getPriorityColor(
                      ticket.priority_name || ticket.priority
                    )}`}
                  >
                    {ticket.priority_name || ticket.priority} Priority
                  </span>

                  {/* Tags */}
                  {Array.isArray(ticket.tags) && ticket.tags.length > 0 && (
                    ticket.tags.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-300"
                      >
                        {tag}
                      </span>
                    ))
                  )}

                  {/* DevOps Link */}
                  <DevOpsLink ticket={ticket} />
                </div>

                {/* Status - Right Aligned */}
                <span
                  className={`px-4 py-2 rounded-full font-semibold text-sm border-2 ${getStatusColor(
                    ticket.status_name || ticket.status
                  )}`}
                >
                  {ticket.status_name || ticket.status}
                </span>
              </div>

              {/* Ticket Details and Timeline Side by Side */}
              <div className="flex gap-6">
                {/* Left: Ticket Details - 50% width */}
                <div className="w-1/2 bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Details</h3>
                  <div className="space-y-4">
                    {/* Requester */}
                    <div className="flex items-start space-x-3">
                      <User className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Requester</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {requester ? requester.name : 'Loading...'}
                        </p>
                        {requester && requester.email && (
                          <p className="text-xs text-gray-600">{requester.email}</p>
                        )}
                      </div>
                    </div>

                    {/* League */}
                    <div className="flex items-start space-x-3">
                      <Tag className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">League</p>
                        <p className="text-sm font-semibold text-gray-900">{ticket.league || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Team */}
                    <div className="flex items-start space-x-3">
                      <Tag className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Team</p>
                        <p className="text-sm font-semibold text-gray-900">{ticket.team || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Timeline - 50% width */}
                <div className="w-1/2">
                  {ticket && <TicketTimeline ticket={ticket} />}
                </div>
              </div>

              {/* Additional Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Assigned To */}
                {ticket.assigned_to && (
                  <div className="flex items-center space-x-2 text-gray-700">
                    <User className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Assigned To</p>
                      <p className="font-semibold">{ticket.assigned_to}</p>
                    </div>
                  </div>
                )}

                {/* Resolved Date */}
                {ticket.resolved_at && (
                  <div className="flex items-center space-x-2 text-gray-700">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Resolved</p>
                      <p className="font-semibold">{formatDate(ticket.resolved_at)}</p>
                    </div>
                  </div>
                )}

                {/* First Response Time */}
                {ticket.first_response_time && (
                  <div className="flex items-center space-x-2 text-gray-700">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">First Response Time</p>
                      <p className="font-semibold">{formatTime(ticket.first_response_time)}</p>
                    </div>
                  </div>
                )}

                {/* Resolution Time */}
                {ticket.resolution_time && (
                  <div className="flex items-center space-x-2 text-gray-700">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Resolution Time</p>
                      <p className="font-semibold">{formatTime(ticket.resolution_time)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {ticket.description && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                  <div
                    className="text-gray-700 text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: ticket.description }}
                  />
                </div>
              )}

              {/* Freshdesk Link - Always Visible */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <a
                  href={ticket.freshdesk_url || `https://arms.freshdesk.com/a/tickets/${ticketId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  <LinkIcon className="w-5 h-5" />
                  <span>View Full Ticket in Freshdesk</span>
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;
