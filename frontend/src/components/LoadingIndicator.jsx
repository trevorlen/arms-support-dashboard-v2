import React from 'react';
import { Loader2, Database, Clock } from 'lucide-react';

const LoadingIndicator = ({ dateRange }) => {
  // Estimate loading time based on date range
  const getEstimate = () => {
    if (dateRange === 'last_week' || dateRange === '1') {
      return { time: '10-20 seconds', message: 'Fetching recent tickets...' };
    } else if (dateRange === '7' || dateRange === '14') {
      return { time: '15-30 seconds', message: 'Fetching tickets from the past few weeks...' };
    } else if (dateRange === '30') {
      return { time: '30-45 seconds', message: 'Fetching monthly data...' };
    } else if (dateRange === '90') {
      return { time: '45-90 seconds', message: 'Fetching large dataset (90 days)...' };
    }
    return { time: '20-40 seconds', message: 'Loading data...' };
  };

  const estimate = getEstimate();

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="flex flex-col items-center space-y-6">
          {/* Animated spinner */}
          <div className="relative">
            <Loader2 className="w-16 h-16 text-primary-600 animate-spin" />
            <Database className="w-8 h-8 text-primary-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>

          {/* Loading message */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">
              {estimate.message}
            </h3>
            <p className="text-sm text-gray-600">
              This may take up to <span className="font-medium text-primary-600">{estimate.time}</span>
            </p>
          </div>

          {/* Progress steps */}
          <div className="w-full space-y-3 pt-4 border-t border-gray-200">
            <div className="flex items-start space-x-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse"></div>
              </div>
              <div>
                <p className="text-gray-700 font-medium">Fetching ticket data</p>
                <p className="text-gray-500 text-xs">Paginating through Freshdesk API (100 tickets per page)</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Clock className="w-3 h-3 text-gray-400" />
              </div>
              <div>
                <p className="text-gray-600">Processing analytics</p>
                <p className="text-gray-400 text-xs">Calculating statistics and trends</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Database className="w-3 h-3 text-gray-400" />
              </div>
              <div>
                <p className="text-gray-600">Caching results</p>
                <p className="text-gray-400 text-xs">Storing data for faster subsequent loads (5 min cache)</p>
              </div>
            </div>
          </div>

          {/* Info note */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 w-full">
            <p className="text-xs text-blue-800">
              <span className="font-semibold">Note:</span> Large date ranges may return thousands of tickets.
              Subsequent loads will be faster thanks to caching.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingIndicator;
