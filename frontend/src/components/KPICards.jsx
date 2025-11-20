import React, { useMemo } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, Timer, ArrowUpRight, ArrowDownRight, Target } from 'lucide-react';

const KPICards = ({ stats, tickets, loading, dateRange }) => {
  // ARMS Support Product ID for filtering
  const ARMS_PRODUCT_ID = '154000020827';

  // Calculate metrics for current and previous periods
  const { currentMetrics, previousMetrics, trends } = useMemo(() => {
    if (!tickets?.data || !dateRange) {
      return { currentMetrics: {}, previousMetrics: {}, trends: {} };
    }

    const currentStart = new Date(dateRange.start_date);
    const currentEnd = new Date(dateRange.end_date);

    // Calculate the duration in milliseconds
    const duration = currentEnd - currentStart;

    // Previous period: same duration, ending just before current period starts
    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - duration);

    // Helper function to check if a date is in a given range
    const isInRange = (dateStr, start, end) => {
      const date = new Date(dateStr);
      return date >= start && date <= end;
    };

    // Helper function to check if ticket is resolved/closed
    const isResolved = (ticket) => {
      const status = ticket.status_name || ticket.status || '';
      return status === 'Resolved' || status === 'Closed';
    };

    // Calculate metrics for current period (filter by ARMS Support product and date range)
    const currentCreated = tickets.data.filter(t => {
      const matchesProduct = !t.product_id || String(t.product_id) === ARMS_PRODUCT_ID;
      return matchesProduct && t.created_at && isInRange(t.created_at, currentStart, currentEnd);
    });

    const currentResolved = currentCreated.filter(isResolved);

    // Calculate median response time for current period
    const currentResponseTimes = currentCreated
      .map(t => t.first_response_time || t.stats?.first_response_time)
      .filter(rt => rt != null && rt > 0)
      .sort((a, b) => a - b);

    const currentMedianResponse = currentResponseTimes.length > 0
      ? currentResponseTimes[Math.floor(currentResponseTimes.length / 2)]
      : 0;

    // Calculate metrics for previous period (filter by ARMS Support product and date range)
    const previousCreated = tickets.data.filter(t => {
      const matchesProduct = !t.product_id || String(t.product_id) === ARMS_PRODUCT_ID;
      return matchesProduct && t.created_at && isInRange(t.created_at, previousStart, previousEnd);
    });

    const previousResolved = previousCreated.filter(isResolved);

    // Calculate median response time for previous period
    const previousResponseTimes = previousCreated
      .map(t => t.first_response_time || t.stats?.first_response_time)
      .filter(rt => rt != null && rt > 0)
      .sort((a, b) => a - b);

    const previousMedianResponse = previousResponseTimes.length > 0
      ? previousResponseTimes[Math.floor(previousResponseTimes.length / 2)]
      : 0;

    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // For response time, negative change is good (faster response)
    const responseTimeChange = previousMedianResponse > 0
      ? calculateChange(currentMedianResponse, previousMedianResponse)
      : 0;

    return {
      currentMetrics: {
        created: currentCreated.length,
        resolved: currentResolved.length,
        medianResponseTime: currentMedianResponse,
      },
      previousMetrics: {
        created: previousCreated.length,
        resolved: previousResolved.length,
        medianResponseTime: previousMedianResponse,
      },
      trends: {
        created: calculateChange(currentCreated.length, previousCreated.length),
        resolved: calculateChange(currentResolved.length, previousResolved.length),
        medianResponseTime: responseTimeChange,
      }
    };
  }, [tickets, dateRange]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  // Format response time
  const formatResponseTime = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // Calculate unresolved tickets (currently unresolved, not based on date range)
  const totalTickets = stats?.tickets?.total || 0;
  const resolvedTickets = stats?.tickets?.resolved || 0;
  const unresolvedTickets = totalTickets - resolvedTickets;

  // Use calculated metrics for display (ensures proper date filtering)
  const ticketsCreated = currentMetrics.created || 0;
  const ticketsResolved = currentMetrics.resolved || 0;

  // Use median response time from summary stats if available, otherwise use calculated
  const medianResponseTime = stats?.response_time?.median || currentMetrics.medianResponseTime || 0;

  // Calculate priority breakdown from tickets data (filtered by date range and product)
  const priorityBreakdown = useMemo(() => {
    if (!tickets?.data || !dateRange) return { Urgent: 0, High: 0, Medium: 0, Low: 0, total: 0 };

    const currentStart = new Date(dateRange.start_date);
    const currentEnd = new Date(dateRange.end_date);

    const counts = {
      Urgent: 0,
      High: 0,
      Medium: 0,
      Low: 0
    };

    tickets.data.forEach((ticket) => {
      // Filter by product_id to ensure only ARMS Support tickets
      const matchesProduct = !ticket.product_id || String(ticket.product_id) === ARMS_PRODUCT_ID;

      // Filter by date range
      if (matchesProduct && ticket.created_at) {
        const ticketDate = new Date(ticket.created_at);
        if (ticketDate >= currentStart && ticketDate <= currentEnd) {
          const priority = ticket.priority_name || ticket.priority || 'Unknown';
          if (counts.hasOwnProperty(priority)) {
            counts[priority]++;
          }
        }
      }
    });

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

    return { ...counts, total };
  }, [tickets, dateRange]);

  const cards = [
    {
      title: 'Tickets Created',
      value: ticketsCreated,
      icon: TrendingUp,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      change: trends.created,
      showTrend: true,
    },
    {
      title: 'Tickets Resolved',
      value: ticketsResolved,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      change: trends.resolved,
      showTrend: true,
    },
    {
      title: 'Median Response Time',
      value: formatResponseTime(medianResponseTime),
      icon: Timer,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      showTrend: false, // No trend for response time
    },
    {
      title: 'Current Unresolved Tickets',
      value: unresolvedTickets,
      icon: Clock,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      showTrend: false, // No trend for current unresolved tickets
    },
    {
      title: 'Priority Breakdown',
      value: null, // Will render custom content
      icon: Target,
      color: 'gray',
      bgColor: 'bg-gray-50',
      iconColor: 'text-gray-600',
      showTrend: false,
      customContent: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const hasChange = card.showTrend && card.change !== undefined && card.change !== null && !isNaN(card.change);

        // Determine if the change is positive or negative
        // For response time (invertColors), negative is good, positive is bad
        const isPositive = card.invertColors ? card.change < 0 : card.change > 0;
        const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
        const ChangeIcon = isPositive ? ArrowUpRight : ArrowDownRight;

        return (
          <div
            key={index}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <Icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
              {hasChange && (
                <div className={`flex items-center ${changeColor} text-xs font-semibold`}>
                  <ChangeIcon className="w-4 h-4 mr-1" />
                  {Math.abs(card.change).toFixed(1)}%
                </div>
              )}
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">
              {card.title}
            </h3>

            {card.customContent ? (
              // Custom priority breakdown content
              <div className="space-y-2 flex-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-red-600 font-semibold">Urgent:</span>
                  <span className="font-bold text-gray-900">{priorityBreakdown.Urgent}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-orange-600 font-semibold">High:</span>
                  <span className="font-bold text-gray-900">{priorityBreakdown.High}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-yellow-600 font-semibold">Medium:</span>
                  <span className="font-bold text-gray-900">{priorityBreakdown.Medium}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-green-600 font-semibold">Low:</span>
                  <span className="font-bold text-gray-900">{priorityBreakdown.Low}</span>
                </div>
              </div>
            ) : (
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default KPICards;
