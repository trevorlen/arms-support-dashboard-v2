import React, { useState, useEffect } from 'react';
import { BarChart3, Trophy, Clock, RefreshCw, Calendar, CalendarDays, FileText, Target } from 'lucide-react';
import KPICards from './components/KPICards';
import PlatformDashboard from './components/PlatformDashboard';
import LeagueDashboard from './components/LeagueDashboard';
import HourOfDayDashboard from './components/HourOfDayDashboard';
import DayOfWeekDashboard from './components/DayOfWeekDashboard';
import TicketTypesDashboard from './components/TicketTypesDashboard';
import PriorityIssueTypeDashboard from './components/PriorityIssueTypeDashboard';
import TicketDetailModal from './components/TicketDetailModal';
import { getTickets, getSummary, getHealth } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('platform');
  const [tickets, setTickets] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [daysBack, setDaysBack] = useState(7);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check API health first
      const healthResponse = await getHealth();
      setApiStatus('connected');

      // Fetch tickets and summary in parallel
      const [ticketsResponse, summaryResponse] = await Promise.all([
        getTickets({ days_back: daysBack, limit: 10000 }),
        getSummary({ days_back: daysBack }),
      ]);

      setTickets(ticketsResponse);
      setSummary(summaryResponse.data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
      setApiStatus('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [daysBack]);

  const tabs = [
    { id: 'platform', name: 'By Platform', icon: BarChart3 },
    { id: 'league', name: 'By League', icon: Trophy },
    { id: 'hour', name: 'By Hour', icon: Clock },
    { id: 'dayofweek', name: 'By Day', icon: CalendarDays },
    { id: 'types', name: 'By Type', icon: FileText },
    { id: 'priority', name: 'Priority & Issues', icon: Target },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary-600 to-primary-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">ARMS Support Dashboard</h1>
              <p className="text-primary-100 mt-1">
                Real-time ticket analytics and insights
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* API Status Indicator */}
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    apiStatus === 'connected'
                      ? 'bg-green-400'
                      : apiStatus === 'error'
                      ? 'bg-red-400'
                      : 'bg-yellow-400'
                  } animate-pulse`}
                ></div>
                <span className="text-sm text-white">
                  {apiStatus === 'connected'
                    ? 'Connected'
                    : apiStatus === 'error'
                    ? 'Disconnected'
                    : 'Checking...'}
                </span>
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Date Range Selector */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
            <select
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          {lastUpdate && (
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-semibold mb-2">Error Loading Data</p>
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <KPICards stats={summary} loading={loading} />

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === tab.id
                            ? 'border-primary-500 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{tab.name}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Dashboard Content */}
            {activeTab === 'platform' && <PlatformDashboard summary={summary} loading={loading} onTicketClick={setSelectedTicketId} />}
            {activeTab === 'league' && <LeagueDashboard tickets={tickets} loading={loading} onTicketClick={setSelectedTicketId} />}
            {activeTab === 'hour' && <HourOfDayDashboard tickets={tickets} loading={loading} onTicketClick={setSelectedTicketId} />}
            {activeTab === 'dayofweek' && <DayOfWeekDashboard tickets={tickets} loading={loading} onTicketClick={setSelectedTicketId} />}
            {activeTab === 'types' && <TicketTypesDashboard tickets={tickets} summary={summary} loading={loading} onTicketClick={setSelectedTicketId} />}
            {activeTab === 'priority' && <PriorityIssueTypeDashboard tickets={tickets} summary={summary} loading={loading} onTicketClick={setSelectedTicketId} />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            ARMS Support Dashboard © 2024 | Powered by React & Tailwind CSS
          </p>
        </div>
      </footer>

      {/* Ticket Detail Modal */}
      {selectedTicketId && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </div>
  );
}

export default App;
