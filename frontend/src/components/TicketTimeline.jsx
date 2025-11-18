import React from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

const TicketTimeline = ({ ticket }) => {
  // Build timeline from available data
  const buildTimeline = () => {
    const events = [];

    // If ticket has a timeline array
    if (ticket.timeline && Array.isArray(ticket.timeline)) {
      return ticket.timeline;
    }

    // Otherwise, build timeline from individual fields
    if (ticket.created_at) {
      events.push({
        timestamp: ticket.created_at,
        event: 'Ticket Created',
        status: 'Open',
        agent: ticket.requester_name || ticket.created_by,
      });
    }

    if (ticket.status_changed_at) {
      events.push({
        timestamp: ticket.status_changed_at,
        event: 'Status Changed',
        status: ticket.status_name || ticket.status,
        agent: ticket.assigned_to,
      });
    }

    if (ticket.resolved_at) {
      events.push({
        timestamp: ticket.resolved_at,
        event: 'Ticket Resolved',
        status: 'Resolved',
        agent: ticket.resolved_by || ticket.assigned_to,
      });
    }

    if (ticket.closed_at) {
      events.push({
        timestamp: ticket.closed_at,
        event: 'Ticket Closed',
        status: 'Closed',
        agent: ticket.closed_by || ticket.assigned_to,
      });
    }

    return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const timeline = buildTimeline();

  if (!timeline || timeline.length === 0) {
    return null;
  }

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventIcon = (event) => {
    const eventLower = (event.event || '').toLowerCase();
    const statusLower = (event.status || '').toLowerCase();

    if (statusLower.includes('resolved') || statusLower.includes('closed')) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else if (statusLower.includes('pending') || eventLower.includes('waiting')) {
      return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    } else {
      return <Clock className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="border-t border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Timeline</h3>
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Timeline Events */}
        <div className="space-y-6">
          {timeline.map((event, index) => (
            <div key={index} className="relative flex items-start space-x-4">
              {/* Icon */}
              <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-white border-2 border-gray-200 rounded-full">
                {getEventIcon(event)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {event.event || 'Status Update'}
                    </p>
                    {event.status && (
                      <p className="text-sm text-gray-600">
                        Status: <span className="font-medium">{event.status}</span>
                      </p>
                    )}
                    {event.agent && (
                      <p className="text-xs text-gray-500 mt-1">
                        by {event.agent}
                      </p>
                    )}
                    {event.notes && (
                      <p className="text-xs text-gray-600 mt-1">
                        {event.notes}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-gray-500 whitespace-nowrap ml-4">
                    {formatDate(event.timestamp)}
                  </time>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TicketTimeline;
