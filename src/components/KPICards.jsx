import React from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, Users, Timer, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const KPICards = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
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

  // Calculate percentage changes
  const createdChange = stats?.tickets?.created_change || 0;
  const resolvedChange = stats?.tickets?.resolved_change || 0;

  const cards = [
    {
      title: 'Tickets Created',
      value: stats?.tickets?.created || stats?.tickets?.total || 0,
      icon: TrendingUp,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      change: createdChange,
    },
    {
      title: 'Tickets Resolved',
      value: stats?.tickets?.resolved || 0,
      icon: CheckCircle,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      change: resolvedChange,
    },
    {
      title: 'First Response Time',
      value: formatResponseTime(stats?.avg_first_response_time || stats?.first_response_time),
      icon: Timer,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Agent Interactions',
      value: stats?.agent_interactions || stats?.total_agent_interactions || 0,
      icon: Users,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      title: 'System Issues',
      value: stats?.system_issues || 0,
      icon: AlertTriangle,
      color: 'red',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
    },
    {
      title: 'Open Tickets',
      value: stats?.tickets?.open || 0,
      icon: Clock,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const hasChange = card.change !== undefined && card.change !== null;
        const isPositive = card.change > 0;
        const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
        const ChangIcon = isPositive ? ArrowUpRight : ArrowDownRight;

        return (
          <div
            key={index}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <Icon className={`w-6 h-6 ${card.iconColor}`} />
              </div>
              {hasChange && (
                <div className={`flex items-center ${changeColor} text-xs font-semibold`}>
                  <ChangIcon className="w-4 h-4 mr-1" />
                  {Math.abs(card.change).toFixed(2)}%
                </div>
              )}
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">
              {card.title}
            </h3>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
};

export default KPICards;
