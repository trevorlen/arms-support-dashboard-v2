import axios from 'axios';

// API Base URL - uses Azure Functions locally (localhost:7071) or Azure Static Web Apps in production
// In production (when VITE_API_URL is not set), use relative path '/api' for Azure Static Web Apps managed functions
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:7071/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,  // 60 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Status ID to Name mapping
const STATUS_MAP = {
  2: 'Open',
  3: 'Pending',
  4: 'Resolved',
  5: 'Closed',
  6: 'Escalated',
  7: 'Awaiting Information',
  8: 'Review Response',
  9: 'Waiting on Customer',
  10: 'Waiting on Third Party',
  11: 'On-Hold',
  12: 'In Backlog'
};

// Helper function to map status ID to name
const mapStatusName = (ticket) => {
  if (ticket.status && typeof ticket.status === 'number' && !ticket.status_name) {
    ticket.status_name = STATUS_MAP[ticket.status] || `Status ${ticket.status}`;
  }
  return ticket;
};

// Add response interceptor for error handling and status mapping
api.interceptors.response.use(
  (response) => {
    // Map status IDs to names for ticket responses
    if (response.data) {
      // Handle single ticket
      if (response.data.data && response.data.data.id) {
        response.data.data = mapStatusName(response.data.data);
      }
      // Handle array of tickets
      else if (response.data.data && Array.isArray(response.data.data)) {
        response.data.data = response.data.data.map(mapStatusName);
      }
      // Handle direct ticket object (for getTicket endpoint)
      else if (response.data.id) {
        response.data = mapStatusName(response.data);
      }
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

/**
 * Fetch tickets with optional filters
 */
export const getTickets = async (params = {}) => {
  try {
    const response = await api.get('/tickets', { params });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch tickets: ${error.message}`);
  }
};

/**
 * Fetch a single ticket by ID
 */
export const getTicket = async (ticketId) => {
  try {
    const response = await api.get(`/ticket/${ticketId}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch ticket: ${error.message}`);
  }
};

/**
 * Fetch summary statistics
 */
export const getSummary = async (params = {}) => {
  try {
    const response = await api.get('/summary', { params });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch summary: ${error.message}`);
  }
};

/**
 * Fetch DevOps work items
 */
export const getDevOpsItems = async (params = {}) => {
  try {
    const response = await api.get('/devops', { params });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch DevOps items: ${error.message}`);
  }
};

/**
 * Fetch API health status
 */
export const getHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch health: ${error.message}`);
  }
};

/**
 * Fetch database statistics
 */
export const getStats = async () => {
  try {
    const response = await api.get('/stats');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch stats: ${error.message}`);
  }
};

export default api;
