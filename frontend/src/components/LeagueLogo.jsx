import React from 'react';

const LeagueLogo = ({ league, size = 'medium' }) => {
  const sizes = {
    small: { height: '40px', width: 'auto' },
    medium: { height: '40px', width: 'auto' },
    large: { height: '40px', width: 'auto' },
    xlarge: { height: '40px', width: 'auto' },
  };

  // Map league names to logo files
  const leagueLogos = {
    'NHL': '/images/leagues/nhl.png',
    'AHL': '/images/leagues/ahl.png',
    'OHL': '/images/leagues/ohl.png',
    'WHL': '/images/leagues/whl.png',
    'LHJMQ': '/images/leagues/lhjmq.png',
    'NBA': '/images/leagues/nba.png',
    'WNBA': '/images/leagues/wnba.png',
    'G-League': '/images/leagues/gleague.png',
    'MLS': '/images/leagues/mls.svg',
    'MLS Academy': '/images/leagues/mls_next.png',
    'MLS Next Pro': '/images/leagues/mls_next_pro.png',
    'USL': '/images/leagues/usl.png',
  };

  const logoSrc = leagueLogos[league];

  if (!logoSrc) {
    // Fallback to text if no logo found
    return (
      <div
        style={{
          ...sizes[size],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#6B7280',
        }}
      >
        {league}
      </div>
    );
  }

  return (
    <img
      src={logoSrc}
      alt={league}
      style={{
        ...sizes[size],
        objectFit: 'contain',
      }}
      onError={(e) => {
        console.error(`Failed to load logo for ${league}:`, logoSrc);
        e.target.style.display = 'none';
      }}
    />
  );
};

export default LeagueLogo;
