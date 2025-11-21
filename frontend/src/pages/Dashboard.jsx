import React, { useState, useEffect } from 'react';
import { BarChart3, Trophy, Clock, RefreshCw, Calendar, CalendarDays, FileText, Target, Users, Sparkles, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import KPICards from '../components/KPICards';
import PlatformDashboard from '../components/PlatformDashboard';
import LeagueDashboard from '../components/LeagueDashboard';
import HourOfDayDashboard from '../components/HourOfDayDashboard';
import DayOfWeekDashboard from '../components/DayOfWeekDashboard';
import TicketTypesDashboard from '../components/TicketTypesDashboard';
import PriorityIssueTypeDashboard from '../components/PriorityIssueTypeDashboard';
import DevOpsDashboard from '../components/DevOpsDashboard';
import ChangeRequestsDashboard from '../components/ChangeRequestsDashboard';
import StaffPerformanceDashboard from '../components/StaffPerformanceDashboard';
import InsightsDashboard from '../components/InsightsDashboard';
import TicketDetailModal from '../components/TicketDetailModal';
import UserManagementModal from '../components/UserManagementModal';
import LoadingIndicator from '../components/LoadingIndicator';
import { getTickets, getSummary, getHealth, getDevOpsItems } from '../services/api';

function Dashboard() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('platform');
  const [tickets, setTickets] = useState(null);
  const [summary, setSummary] = useState(null);
  const [devopsTickets, setDevopsTickets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('last_week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [include2024, setInclude2024] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  // Feature flags
  const ENABLE_CHANGE_REQUESTS = false;

  const calculateDateRange = (range) => {
    const now = new Date();
    let startDate;

    if (range === 'custom') {
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);

        return {
          start_date: start.toISOString(),
          end_date: end.toISOString()
        };
      }
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);

      return {
        start_date: startDate.toISOString(),
        end_date: now.toISOString()
      };
    } else if (range === 'last_week') {
      const currentDay = now.getDay();
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - currentDay);
      thisWeekStart.setHours(0, 0, 0, 0);

      startDate = new Date(thisWeekStart);
      startDate.setDate(thisWeekStart.getDate() - 7);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      return {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      };
    } else if (range === 'this_year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);

      return {
        start_date: startDate.toISOString(),
        end_date: now.toISOString()
      };
    } else {
      const daysBack = Number(range);
      startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      startDate.setHours(0, 0, 0, 0);

      return {
        start_date: startDate.toISOString(),
        end_date: now.toISOString()
      };
    }
  };

  const getDateRangeText = () => {
    const { start_date, end_date } = calculateDateRange(dateRange);
    const start = new Date(start_date);
    const end = new Date(end_date);

    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };

    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const healthResponse = await getHealth();
      setApiStatus('connected');

      const { start_date, end_date } = calculateDateRange(dateRange);
      const currentStart = new Date(start_date);
      const currentEnd = new Date(end_date);
      const duration = currentEnd - currentStart;
      const extendedStart = new Date(currentStart.getTime() - duration);

      const ARMS_PRODUCT_ID = '154000020827';

      const [ticketsResponse, summaryResponse, devopsResponse] = await Promise.all([
        getTickets({ start_date: extendedStart.toISOString(), limit: 10000, product_id: ARMS_PRODUCT_ID, include_2024: include2024 }),
        getSummary({ start_date, product_id: ARMS_PRODUCT_ID, include_2024: include2024 }),
        getDevOpsItems(),
      ]);

      setTickets(ticketsResponse);
      setSummary(summaryResponse.data);
      setDevopsTickets(devopsResponse.data);
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
  }, [dateRange, include2024, customStartDate, customEndDate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const tabs = [
    { id: 'platform', name: 'Overview', icon: BarChart3 },
    { id: 'league', name: 'By League', icon: Trophy },
    { id: 'hour', name: 'By Hour', icon: Clock },
    { id: 'dayofweek', name: 'By Day', icon: CalendarDays },
    { id: 'types', name: 'By Type', icon: FileText },
    { id: 'priority', name: 'Issues', icon: Target },
    { id: 'devops', name: 'DevOps', icon: BarChart3 },
    ...(ENABLE_CHANGE_REQUESTS ? [{ id: 'changerequest', name: 'Change Requests', icon: FileText }] : []),
    { id: 'staff', name: 'Staff Performance', icon: Users },
    { id: 'insights', name: 'AI Insights', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary-600 to-primary-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src="/arms-logo.png"
                alt="ARMS Logo"
                className="h-16 w-auto"
              />
              <div>
                <h1 className="text-3xl font-bold text-white">Support Management Dashboard</h1>
                <p className="text-primary-100 mt-1">
                  Real-time ticket analytics and insights
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="text-right">
                <p className="text-sm text-white font-medium">{user?.full_name}</p>
                <p className="text-xs text-primary-100">{user?.role}</p>
              </div>

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

              {/* Admin Button */}
              {isAdmin() && (
                <button
                  onClick={() => setShowUserModal(true)}
                  className="flex items-center bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg transition-all"
                  title="User Management"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}

              {/* Refresh Button */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-red-500 bg-opacity-80 hover:bg-opacity-100 text-white px-4 py-2 rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Date Range Selector */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-4">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Date Range:</span>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="last_week">Last Week (Sun-Sat)</option>
                  <option value={1}>Last 24 hours</option>
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value="this_year">This Year</option>
                  <option value="custom">Custom</option>
                </select>
                {dateRange === 'custom' && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <span className="text-sm text-gray-500">to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                )}
                {!loading && dateRange !== 'custom' && (
                  <span className="text-sm text-primary-600 font-medium">
                    {getDateRangeText()}
                  </span>
                )}
                {!loading && dateRange === 'custom' && customStartDate && customEndDate && (
                  <span className="text-sm text-primary-600 font-medium">
                    {getDateRangeText()}
                  </span>
                )}
              </div>

              {/* Include PY Tickets Checkbox */}
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={include2024}
                  onChange={(e) => setInclude2024(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">Include PY Tickets</span>
              </label>
              {include2024 && (
                <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded">
                  Historical data included
                </span>
              )}
            </div>

            {lastUpdate && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gradient-to-r from-gray-100 via-blue-100 to-gray-100 rounded-lg shadow mt-4">
          <div className="border-b border-gray-200">
            <nav className="md:flex hidden -mb-px overflow-x-auto justify-center">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-white/50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>

            <div className="md:hidden p-4">
              <label htmlFor="tab-select" className="sr-only">Select tab</label>
              <select
                id="tab-select"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base"
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
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
        ) : loading ? (
          <LoadingIndicator dateRange={dateRange} />
        ) : (
          <>
            {activeTab === 'platform' && (
              <>
                <KPICards stats={summary} tickets={tickets} loading={loading} dateRange={calculateDateRange(dateRange)} />
                <PlatformDashboard summary={summary} tickets={tickets} loading={loading} onTicketClick={setSelectedTicketId} dateRange={calculateDateRange(dateRange)} />
              </>
            )}
            {activeTab === 'league' && <LeagueDashboard tickets={tickets} loading={loading} onTicketClick={setSelectedTicketId} dateRange={calculateDateRange(dateRange)} />}
            {activeTab === 'hour' && <HourOfDayDashboard tickets={tickets} loading={loading} onTicketClick={setSelectedTicketId} dateRange={calculateDateRange(dateRange)} />}
            {activeTab === 'dayofweek' && <DayOfWeekDashboard tickets={tickets} loading={loading} onTicketClick={setSelectedTicketId} dateRange={calculateDateRange(dateRange)} />}
            {activeTab === 'types' && <TicketTypesDashboard tickets={tickets} summary={summary} loading={loading} onTicketClick={setSelectedTicketId} dateRange={calculateDateRange(dateRange)} />}
            {activeTab === 'priority' && <PriorityIssueTypeDashboard tickets={tickets} summary={summary} loading={loading} onTicketClick={setSelectedTicketId} dateRange={calculateDateRange(dateRange)} />}
            {activeTab === 'devops' && <DevOpsDashboard devopsTickets={devopsTickets} loading={loading} />}
            {activeTab === 'changerequest' && ENABLE_CHANGE_REQUESTS && <ChangeRequestsDashboard loading={loading} />}
            {activeTab === 'staff' && <StaffPerformanceDashboard tickets={tickets} loading={loading} dateRange={calculateDateRange(dateRange)} />}
            {activeTab === 'insights' && <InsightsDashboard tickets={tickets} stats={summary} loading={loading} dateRange={calculateDateRange(dateRange)} />}
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

      {/* User Management Modal */}
      <UserManagementModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
      />
    </div>
  );
}

export default Dashboard;
