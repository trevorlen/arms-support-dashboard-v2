import React, { useState, useMemo } from 'react';
import { Lightbulb, TrendingUp, Target, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const InsightsDashboard = ({ tickets, stats, loading, dateRange }) => {
  const [insights, setInsights] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFocus, setSelectedFocus] = useState('summary');

  // ARMS Support Product ID for filtering
  const ARMS_PRODUCT_ID = '154000020827';

  // Aggregate ticket data (strip PII)
  const aggregatedData = useMemo(() => {
    if (!tickets?.data || !dateRange) return null;

    const currentStart = new Date(dateRange.start_date);
    const currentEnd = new Date(dateRange.end_date);

    // Filter tickets by date range and product
    const filteredTickets = tickets.data.filter(t => {
      const matchesProduct = !t.product_id || String(t.product_id) === ARMS_PRODUCT_ID;
      if (!matchesProduct) return false;

      if (t.created_at) {
        const ticketDate = new Date(t.created_at);
        return ticketDate >= currentStart && ticketDate <= currentEnd;
      }
      return false;
    });

    // Count by status
    const statusCounts = {};
    filteredTickets.forEach(t => {
      const status = t.status_name || t.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Count by priority
    const priorityCounts = {};
    filteredTickets.forEach(t => {
      const priority = t.priority_name || t.priority || 'Unknown';
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
    });

    // Count by platform
    const platformCounts = {};
    filteredTickets.forEach(t => {
      const platform = t.platform || 'Unknown';
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    });

    // Count by league
    const leagueCounts = {};
    filteredTickets.forEach(t => {
      const league = t.league || 'Unknown';
      leagueCounts[league] = (leagueCounts[league] || 0) + 1;
    });

    // Count by issue type
    const issueTypeCounts = {};
    filteredTickets.forEach(t => {
      const issueType = t.issue_type || 'Unknown';
      issueTypeCounts[issueType] = (issueTypeCounts[issueType] || 0) + 1;
    });

    // Calculate response times (without PII)
    const responseTimes = filteredTickets
      .map(t => t.first_response_time || t.stats?.first_response_time)
      .filter(rt => rt != null && rt > 0)
      .sort((a, b) => a - b);

    const medianResponseTime = responseTimes.length > 0
      ? responseTimes[Math.floor(responseTimes.length / 2)]
      : 0;

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
      : 0;

    // Count resolved tickets
    const resolvedCount = filteredTickets.filter(t => {
      const status = t.status_name || t.status || '';
      return status === 'Resolved' || status === 'Closed';
    }).length;

    // Day of week distribution
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
    filteredTickets.forEach(t => {
      if (t.created_at) {
        const date = new Date(t.created_at);
        const dayOfWeek = date.getDay();
        dayOfWeekCounts[dayOfWeek]++;
      }
    });

    return {
      total_tickets: filteredTickets.length,
      resolved_tickets: resolvedCount,
      resolution_rate: filteredTickets.length > 0 ? (resolvedCount / filteredTickets.length * 100).toFixed(1) : 0,
      median_response_time_seconds: Math.round(medianResponseTime),
      avg_response_time_seconds: Math.round(avgResponseTime),
      status_breakdown: statusCounts,
      priority_breakdown: priorityCounts,
      platform_breakdown: platformCounts,
      league_breakdown: leagueCounts,
      issue_type_breakdown: issueTypeCounts,
      day_of_week_distribution: {
        Sunday: dayOfWeekCounts[0],
        Monday: dayOfWeekCounts[1],
        Tuesday: dayOfWeekCounts[2],
        Wednesday: dayOfWeekCounts[3],
        Thursday: dayOfWeekCounts[4],
        Friday: dayOfWeekCounts[5],
        Saturday: dayOfWeekCounts[6],
      }
    };
  }, [tickets, dateRange]);

  const handleGenerateInsights = async () => {
    if (!aggregatedData) {
      setError('No data available for insights generation');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:7071/api/generate_insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aggregated_data: aggregatedData,
          focus_area: selectedFocus,
          date_range: dateRange,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate insights');
      }

      const data = await response.json();
      setInsights(data);
    } catch (err) {
      console.error('Error generating insights:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const focusOptions = [
    { value: 'summary', label: 'Quick Summary', icon: Sparkles, description: 'High-level executive overview' },
    { value: 'trends', label: 'Trends Analysis', icon: TrendingUp, description: 'Patterns and trends over time' },
    { value: 'performance', label: 'Performance Review', icon: Target, description: 'Team performance metrics' },
    { value: 'priority', label: 'Priority & Risk', icon: AlertTriangle, description: 'Critical issues and risks' },
    { value: 'predictive', label: 'Predictive Insights', icon: Lightbulb, description: 'Forward-looking analysis' },
    { value: 'full', label: 'Full Report', icon: RefreshCw, description: 'Comprehensive analysis' },
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-lg p-8 text-white">
        <div className="flex items-center mb-4">
          <Sparkles className="w-10 h-10 mr-3" />
          <h1 className="text-3xl font-bold">AI-Powered Insights</h1>
        </div>
        <p className="text-purple-100 text-lg">
          Get intelligent analysis and actionable recommendations powered by Claude AI
        </p>
      </div>

      {/* Focus Area Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Analysis Focus</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {focusOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setSelectedFocus(option.value)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedFocus === option.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start">
                  <Icon
                    className={`w-6 h-6 mr-3 mt-0.5 ${
                      selectedFocus === option.value ? 'text-primary-600' : 'text-gray-400'
                    }`}
                  />
                  <div>
                    <h4
                      className={`font-semibold mb-1 ${
                        selectedFocus === option.value ? 'text-primary-900' : 'text-gray-900'
                      }`}
                    >
                      {option.label}
                    </h4>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Generate Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleGenerateInsights}
            disabled={isGenerating || !aggregatedData}
            className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all flex items-center ${
              isGenerating || !aggregatedData
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Generating Insights...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Insights
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-red-500 mr-3 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 mb-1">Error Generating Insights</h4>
              <p className="text-red-700">{error}</p>
              <p className="text-sm text-red-600 mt-2">
                Make sure you have set your ANTHROPIC_API_KEY in local.settings.json
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Insights Display */}
      {insights && (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Analysis Results</h3>
              <p className="text-sm text-gray-600 mt-1">
                Focus: <span className="font-semibold">{focusOptions.find(o => o.value === insights.focus_area)?.label}</span>
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Tokens used: {insights.tokens_used?.input + insights.tokens_used?.output || 'N/A'}</p>
              <p className="text-xs">
                ({insights.tokens_used?.input} input + {insights.tokens_used?.output} output)
              </p>
            </div>
          </div>

          {/* Markdown Content */}
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown>{insights.insights}</ReactMarkdown>
          </div>

          {/* Regenerate Button */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center">
            <button
              onClick={handleGenerateInsights}
              disabled={isGenerating}
              className="px-6 py-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-all flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Insights
            </button>
          </div>
        </div>
      )}

      {/* Getting Started Message */}
      {!insights && !error && !isGenerating && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-8 text-center">
          <Lightbulb className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Generate Insights</h3>
          <p className="text-gray-600 mb-4">
            Select an analysis focus above and click "Generate Insights" to get AI-powered recommendations
          </p>
          <div className="bg-white rounded-lg p-6 mt-6 text-left max-w-2xl mx-auto">
            <h4 className="font-semibold text-gray-900 mb-3">What you'll get:</h4>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2">•</span>
                <span>Strategic insights tailored for executive decision-making</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2">•</span>
                <span>Data-driven recommendations based on your ticket data</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2">•</span>
                <span>Identification of trends, patterns, and anomalies</span>
              </li>
              <li className="flex items-start">
                <span className="text-indigo-500 mr-2">•</span>
                <span>Actionable next steps to improve support operations</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsDashboard;
