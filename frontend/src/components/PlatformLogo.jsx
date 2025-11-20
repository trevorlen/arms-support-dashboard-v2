import React from 'react';

const PlatformLogo = ({ platform, size = 'medium', showLabel = false, className = '' }) => {
  // Map platform/league names to their logo files
  const platformLogos = {
    // General platforms
    'Hockey': '/images/platforms/hockey.png',
    'Soccer': '/images/platforms/soccer.svg',
    'Basketball': '/images/platforms/nba.png',
    // Specific leagues
    'MLB': '/images/platforms/mlb.png',
    'MLS': '/images/platforms/mls.svg',
    'NBA': '/images/platforms/nba.png',
    'NHL': '/images/platforms/nhl.png',
    'CHL': '/images/platforms/CHL.png',
    'CFL': '/images/platforms/cfl.png',
    'ATP': '/images/platforms/atp.png',
    'WSL': '/images/platforms/wsl.png',
    'ECHL': '/images/platforms/echl.png',
    'Multi': '/images/platforms/multi.png',
    'Multisport': '/images/platforms/multi.png',
    'Clinic': '/images/platforms/clinic.png',
  };

  // Size mappings
  const sizes = {
    small: { height: '40px', width: 'auto' },
    medium: { height: '40px', width: 'auto' },
    large: { height: '40px', width: 'auto' },
    xlarge: { height: '40px', width: 'auto' },
  };

  const logoSrc = platformLogos[platform];
  const sizeStyle = typeof size === 'object' ? size : sizes[size] || sizes.medium;

  if (!logoSrc) {
    // Fallback to text if logo not found
    return (
      <span className={`text-gray-700 font-medium ${className}`}>
        {platform}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <img
        src={logoSrc}
        alt={`${platform} logo`}
        style={sizeStyle}
        className="object-contain"
        title={platform}
      />
      {showLabel && (
        <span className="text-gray-700 font-medium">{platform}</span>
      )}
    </div>
  );
};

export default PlatformLogo;
