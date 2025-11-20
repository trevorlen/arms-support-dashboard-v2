import React, { useEffect, useState } from 'react';
import { X, Clock, User, Tag, Calendar, Link as LinkIcon, AlertTriangle, GitBranch } from 'lucide-react';
import { getDevOpsItem } from '../services/api';

const DevOpsDetailModal = ({ workItemId, onClose }) => {
  const [workItem, setWorkItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWorkItem = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getDevOpsItem(workItemId);
        const itemData = response.workItem || response.data || response;
        console.log('DevOps Work Item data:', itemData);
        setWorkItem(itemData);
      } catch (err) {
        console.error('Error fetching work item:', err);
        setError(err.message || 'Failed to load work item details');
      } finally {
        setLoading(false);
      }
    };

    if (workItemId) {
      fetchWorkItem();
    }
  }, [workItemId]);

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

  const getWorkItemTypeColor = (type) => {
    const colors = {
      'Bug': 'bg-red-100 text-red-800 border-red-300',
      'Task': 'bg-blue-100 text-blue-800 border-blue-300',
      'User Story': 'bg-purple-100 text-purple-800 border-purple-300',
      'Product Backlog Item': 'bg-purple-100 text-purple-800 border-purple-300',
      'Feature': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'Issue': 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusColor = (status) => {
    const colors = {
      'New': 'bg-blue-100 text-blue-800 border-blue-200',
      'Active': 'bg-green-100 text-green-800 border-green-200',
      'Resolved': 'bg-purple-100 text-purple-800 border-purple-200',
      'Closed': 'bg-gray-100 text-gray-800 border-gray-200',
      'In Progress': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Done': 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (!workItemId) return null;

  // Get assigned person from fields or System.AssignedTo
  const getAssignedTo = (item) => {
    if (!item) return null;

    // Check fields first (nested structure)
    if (item.fields?.['System.AssignedTo']?.displayName) {
      return item.fields['System.AssignedTo'].displayName;
    }

    // Check direct properties
    if (item.assigned_to) {
      return item.assigned_to;
    }

    // Check System.AssignedTo at root level
    if (item['System.AssignedTo']?.displayName) {
      return item['System.AssignedTo'].displayName;
    }

    return null;
  };

  // Get Freshdesk ticket link
  const getFreshdeskLink = (item) => {
    if (!item) return null;

    const freshdeskId = item.custom?.freshdesklink ||
                       item.freshdesk_ticket_id ||
                       item.custom?.freshdesk_link ||
                       item.custom?.freshdesk_ticket_id ||
                       item.cf_freshdesk_link;

    if (!freshdeskId) return null;

    // Extract just the number if it's a URL
    let ticketNumber = freshdeskId;
    if (typeof freshdeskId === 'string' && freshdeskId.includes('/')) {
      const match = freshdeskId.match(/\/tickets\/(\d+)/);
      ticketNumber = match ? match[1] : freshdeskId;
    }

    return ticketNumber;
  };

  const assignedTo = getAssignedTo(workItem);
  const freshdeskTicket = getFreshdeskLink(workItem);

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
            <GitBranch className="w-5 h-5" />
            <h2 className="text-xl font-bold">Work Item #{workItemId}</h2>
            {workItem && (
              <span className="text-primary-100 text-sm">
                {workItem.title || workItem.fields?.['System.Title'] || 'Work Item'}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {assignedTo && (
              <div className="flex items-center space-x-2 text-white">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{assignedTo}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
              <p className="text-red-800 font-semibold mb-2">Error Loading Work Item</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          ) : workItem ? (
            <div className="space-y-6">
              {/* Badge Row: Work Item Type, Status, Tags */}
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center">
                  {/* Work Item Type */}
                  <span
                    className={`px-4 py-2 rounded-lg font-semibold text-sm border-2 ${getWorkItemTypeColor(
                      workItem.work_item_type || workItem.fields?.['System.WorkItemType']
                    )}`}
                  >
                    {workItem.work_item_type || workItem.fields?.['System.WorkItemType']}
                  </span>

                  {/* Priority */}
                  {(workItem.priority || workItem.fields?.['Microsoft.VSTS.Common.Priority']) && (
                    <span className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium border border-orange-300">
                      Priority: {workItem.priority || workItem.fields?.['Microsoft.VSTS.Common.Priority']}
                    </span>
                  )}

                  {/* Tags */}
                  {workItem.tags && (() => {
                    // Tags come as a semicolon-separated string from Azure DevOps
                    const tagsArray = typeof workItem.tags === 'string'
                      ? workItem.tags.split(';').map(t => t.trim()).filter(t => t)
                      : Array.isArray(workItem.tags) ? workItem.tags : [];

                    return tagsArray.length > 0 && tagsArray.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium border border-gray-300"
                      >
                        {tag}
                      </span>
                    ));
                  })()}

                  {/* Freshdesk Link */}
                  {freshdeskTicket && (
                    <a
                      href={`https://arms.freshdesk.com/a/tickets/${freshdeskTicket}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium border border-blue-300 hover:bg-blue-200 transition-colors flex items-center space-x-1"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>FD #{freshdeskTicket}</span>
                    </a>
                  )}
                </div>

                {/* Status - Right Aligned */}
                <span
                  className={`px-4 py-2 rounded-full font-semibold text-sm border-2 ${getStatusColor(
                    workItem.state || workItem.fields?.['System.State']
                  )}`}
                >
                  {workItem.state || workItem.fields?.['System.State']}
                </span>
              </div>

              {/* Work Item Details */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Item Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Area Path */}
                  {(workItem.area_path || workItem.fields?.['System.AreaPath']) && (
                    <div className="flex items-start space-x-3">
                      <Tag className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Area</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {workItem.area_path || workItem.fields?.['System.AreaPath']}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Iteration Path */}
                  {(workItem.iteration_path || workItem.fields?.['System.IterationPath']) && (
                    <div className="flex items-start space-x-3">
                      <Tag className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Iteration</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {workItem.iteration_path || workItem.fields?.['System.IterationPath']}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="flex items-start space-x-3">
                    <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Created</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(workItem.created_date || workItem.fields?.['System.CreatedDate'])}
                      </p>
                    </div>
                  </div>

                  {/* Changed Date */}
                  {(workItem.changed_date || workItem.fields?.['System.ChangedDate']) && (
                    <div className="flex items-start space-x-3">
                      <Clock className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Last Updated</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDate(workItem.changed_date || workItem.fields?.['System.ChangedDate'])}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {(workItem.description || workItem.fields?.['System.Description']) && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                  <div
                    className="text-gray-700 text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: workItem.description || workItem.fields?.['System.Description'] || ''
                    }}
                  />
                </div>
              )}

              {/* Azure DevOps Link */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <a
                  href={workItem.url || workItem._links?.html?.href || `https://dev.azure.com/your-org/_workitems/edit/${workItemId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  <LinkIcon className="w-5 h-5" />
                  <span>View in Azure DevOps</span>
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default DevOpsDetailModal;
