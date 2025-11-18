import React from 'react';
import { GitBranch, ExternalLink } from 'lucide-react';

const DevOpsLink = ({ ticket }) => {
  // Check for various possible DevOps link field names
  const getDevOpsInfo = () => {
    // Check for different field formats
    if (ticket.devops_ticket_id || ticket.devops_link || ticket.azure_devops_id) {
      return {
        id: ticket.devops_ticket_id || ticket.azure_devops_id,
        url: ticket.devops_link || ticket.devops_url || ticket.azure_devops_url,
      };
    }

    // Check for related_work_items array
    if (ticket.related_work_items && Array.isArray(ticket.related_work_items)) {
      const devopsItem = ticket.related_work_items.find(
        (item) => item.type === 'azure_devops' || item.type === 'devops'
      );
      if (devopsItem) {
        return {
          id: devopsItem.external_id || devopsItem.id,
          url: devopsItem.url || devopsItem.link,
        };
      }
    }

    // Check for custom field variants
    if (ticket.cf_devops_ticket_id || ticket.cf_azure_devops_id) {
      return {
        id: ticket.cf_devops_ticket_id || ticket.cf_azure_devops_id,
        url: ticket.cf_devops_link || ticket.cf_devops_url,
      };
    }

    return null;
  };

  const devopsInfo = getDevOpsInfo();

  if (!devopsInfo || !devopsInfo.id) {
    return null;
  }

  return (
    <div className="inline-flex items-center">
      {devopsInfo.url ? (
        <a
          href={devopsInfo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-semibold text-sm"
        >
          <GitBranch className="w-4 h-4" />
          <span>DevOps #{devopsInfo.id}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-lg border border-blue-300 font-semibold text-sm">
          <GitBranch className="w-4 h-4" />
          <span>Linked to DevOps #{devopsInfo.id}</span>
        </div>
      )}
    </div>
  );
};

export default DevOpsLink;
