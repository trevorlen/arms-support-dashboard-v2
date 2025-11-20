# ARMS Support Dashboard - Executive User Guide

## Executive Overview

The ARMS Support Dashboard provides real-time visibility into customer support operations across all platforms and leagues. This guide explains how metrics are calculated, what they mean for the business, and how to interpret trends for strategic decision-making.

---

## Dashboard Navigation

### Main Tabs

The dashboard is organized into eight analytical views:

1. **Platform** - Overall health metrics and platform distribution
2. **League** - Support volume by sports league with team drill-down
3. **Hour of Day** - Temporal patterns showing peak support hours
4. **Day of Week** - Weekly patterns identifying busy days
5. **Types** - Ticket categorization by type and source
6. **Issues** - System vs User issues with priority tracking
7. **DevOps** - Integration with Azure DevOps work items
8. **Staff** - Team performance and workload distribution

---

## Date Range Selection

The dashboard supports flexible time periods:

- **Last 7 Days** - Week-over-week operational view
- **Last 30 Days** - Monthly trends and patterns
- **Last 90 Days** - Quarterly analysis
- **This Quarter** - Current quarter performance
- **Last Quarter** - Previous quarter comparison
- **This Year** - Year-to-date metrics
- **Custom Range** - Any specific date range

**Include PY Tickets**: Toggle to include tickets from the previous year for year-over-year comparisons.

---

## Platform Dashboard - The Executive View

### Key Performance Indicators (KPIs)

The four primary KPI cards provide instant operational health:

#### 1. Tickets Created
- **What it measures**: Total new support requests in the selected period
- **Trend indicator**: Percentage change vs. previous period
- **Strategic insight**: Growing volume may indicate product adoption (positive) or quality issues (negative)
- **Green arrow**: More tickets than previous period
- **Red arrow**: Fewer tickets than previous period

#### 2. Tickets Resolved
- **What it measures**: Support requests successfully closed in the period
- **Trend indicator**: Percentage change vs. previous period
- **Strategic insight**: Resolution rate indicates team efficiency and issue complexity
- **Target**: Should generally match or exceed "Tickets Created" to avoid backlog growth

#### 3. Median Response Time
- **What it measures**: Time from ticket creation to first response (in hours/minutes)
- **Why median**: More reliable than average, ignores outliers
- **Strategic insight**: First response speed drives customer satisfaction
- **Industry benchmark**: Under 8 hours is considered excellent for B2B

#### 4. Current Unresolved Tickets
- **What it measures**: Active backlog requiring attention (as of right now)
- **Strategic insight**: Growing backlog indicates capacity constraints or complexity issues
- **Action threshold**: Sustained growth requires staffing or process review

#### 5. Priority Breakdown
- **What it measures**: Distribution of tickets by urgency level
- **Categories**:
  - **Urgent**: Critical system failures requiring immediate attention
  - **High**: Major issues affecting multiple users
  - **Medium**: Standard support requests
  - **Low**: Minor issues or enhancement requests
- **Strategic insight**: High urgent/high ticket ratio indicates product stability concerns

### Platform Distribution

**Bar Chart Analysis**:
- Shows ticket volume by platform (iOS, Android, Web, etc.)
- Click any bar to see ticket type breakdown for that platform
- **Use case**: Identify which platforms generate most support burden
- **Strategic question**: Does support volume correlate with user base size? If not, why?

**Key Metrics**:
- **Total tickets** per platform with percentage of total volume
- **Ticket type breakdown** in tooltip (on hover):
  - Bug, Feature Request, Question, Incident, etc.
  - Helps identify if platform needs development resources vs. documentation

---

## League Dashboard - Customer Segment Analysis

### League-Level View

**Purpose**: Understand support load by sports league (customer segment)

**Bar Chart**:
- Horizontal bars showing ticket volume by league
- Sorted by volume (highest at top)
- **Interactive**: Click any league to drill down to teams

**Platform Filter**:
- Filter league data by platform (iOS, Android, Web)
- **Use case**: "Which leagues drive most mobile support requests?"

### Team Drill-Down

After clicking a league:
- Shows ticket distribution across teams in that league
- Identifies high-support teams requiring account management attention
- **Strategic insight**: Teams with disproportionate support volume may need:
  - Additional training
  - Product customization
  - Account review

**Back Button**: Returns to league-level view

### Recent Tickets Table

Shows last 10 tickets with:
- Ticket number (clickable for details)
- Subject line
- League and team
- Status (color-coded)
- Created date
- DevOps link (if applicable)

**Pagination**: Browse through all tickets in the filtered view

---

## Hour of Day Dashboard - Operational Timing

### What This Tells You

**Peak Hours**:
- When do customers need the most support?
- Does this align with staff availability?
- Should we adjust shift patterns?

**24-Hour Area Chart**:
- X-axis: Hours (0-23 in 24-hour format)
- Y-axis: Ticket volume
- Shaded area shows daily pattern

**Busiest Hour Card**:
- Highlights peak support time
- Total tickets during that hour
- **Staffing implication**: Ensure adequate coverage during this window

**Platform Filter**:
- View hour patterns by platform
- **Example insight**: iOS users may log more tickets during commute hours

---

## Day of Week Dashboard - Weekly Patterns

### Strategic Workforce Planning

**Purpose**: Optimize staffing based on weekly demand patterns

**Weekly Distribution Chart**:
- Shows ticket volume for each day (Sunday-Saturday)
- Identifies busy and quiet days

**Key Metrics**:
- **Total Tickets**: Week's total volume
- **Daily Average**: Expected daily load (useful for capacity planning)
- **Busiest Day**: Peak demand day with ticket count

**Day Cards**:
- Each day shows:
  - Ticket count
  - Percentage of weekly total
  - Fire emoji (🔥) marks busiest day

**Business Questions**:
- Should we reduce weekend staffing?
- Do Monday tickets indicate weekend issues accumulating?
- Are Friday spikes due to users preparing for weekend events?

---

## Types Dashboard - Request Categorization

### Ticket Source Analysis

**Understanding Where Tickets Come From**:
- **Email**: tickets@arms.com submissions
- **Portal**: Self-service web portal
- **Phone**: Direct calls to support
- **Chat**: Live chat sessions
- **API**: Automated system integrations

**Pie Chart**:
- Visual distribution of ticket sources
- Total count per source
- Percentage breakdown

**Strategic Insights**:
- High email volume may indicate portal isn't discoverable
- Low portal usage suggests need for better self-service
- Phone spikes might mean urgent issues or poor documentation

### Ticket Type Distribution

**Categories**:
- **Bug**: Software defects requiring engineering
- **Feature Request**: Customer enhancement requests
- **Question**: How-to and usage inquiries
- **Incident**: Service disruptions
- **Problem**: Recurring issues requiring root cause analysis
- **Service Request**: Configuration or access changes

**Bar Chart**:
- Horizontal bars showing volume per type
- Hover for exact counts

**Business Intelligence**:
- **High "Question" volume**: Documentation gaps or training needs
- **Many "Feature Requests"**: Product roadmap input
- **Frequent "Bugs"**: Quality assurance concerns
- **Numerous "Incidents"**: Infrastructure stability issues

---

## Issues Dashboard - Product Health Monitoring

### The Most Strategic Tab

This tab separates operational support from product quality signals.

### Issue Type Classification

**System Issues**:
- **Definition**: Problems with the ARMS platform itself
- **Examples**: App crashes, data sync failures, login problems
- **Ownership**: Engineering/Product teams
- **Strategic signal**: Product stability and quality

**User Issues**:
- **Definition**: User errors, training gaps, configuration problems
- **Examples**: "How do I...?", incorrect data entry, feature misunderstanding
- **Ownership**: Support team, potentially training/documentation
- **Strategic signal**: User experience and onboarding effectiveness

**Dev Assistance Needed**:
- **Definition**: Issues requiring developer investigation
- **Flag**: Manually marked by support team
- **Strategic signal**: Complex issues consuming engineering time

### Metric Cards Logic

**Important Note on Counting**:
- **Unresolved tickets**: Count ALL unresolved issues created on or before the date range end
  - **Why**: These represent current backlog that existed during or before the period
  - **Example**: If viewing "Last 30 Days" and an issue from 2 months ago is still open, it counts

- **Resolved tickets**: Count only those created AND resolved within the date range
  - **Why**: Measures team productivity during the specific period

This dual approach gives accurate historical analysis while tracking current reality.

### Priority Distribution

**Pie Chart**:
- Urgent (Red)
- High (Orange)
- Medium (Yellow)
- Low (Green)

**Health Indicators**:
- **Healthy**: Mostly Medium/Low
- **Concerning**: Growing Urgent/High proportion
- **Critical**: Sustained high Urgent count (product crisis signal)

### Issues Table

**Two Tabs**:
1. **System Issues**: Product defects requiring fixes
2. **User Issues**: Training and support opportunities

**Filter Options**:
- **Status Filter**:
  - "Open" - Unresolved only
  - "All" - Includes resolved tickets for historical analysis

**Columns**:
- Ticket number (clickable)
- Subject
- Platform affected
- Status (color-coded badges)
- Created date
- DevOps link

**Color-Coded Status**:
- **Blue** (Open): New ticket, not yet assigned
- **Purple** (In Progress): Actively being worked
- **Indigo** (In Backlog): Queued for future work
- **Cyan** (Review Response): Awaiting customer feedback
- **Yellow** (Pending): On hold
- **Orange** (Awaiting Information): Need more details
- **Amber** (Waiting on Third Party): External dependency
- **Green** (Resolved): Fixed and closed
- **Gray** (Closed): Permanently closed

**Sorting**:
- Click any column header to sort
- Unresolved tickets always appear first (business priority)
- Second-level sort by selected column

---

## DevOps Dashboard - Engineering Workflow

### Purpose

Links support tickets to engineering work items in Azure DevOps.

**What You See**:
- Work items from Azure DevOps boards
- Status and assignment
- Link to ticket that generated the work

**Strategic Value**:
- Tracks support ticket → engineering work conversion
- Measures engineering response to support feedback
- Identifies gap between reported issues and roadmap priorities

**Note**: Requires Azure DevOps integration to be configured.

---

## Staff Performance Dashboard - Team Analytics

### Individual Performance Metrics

**Performance Cards (per agent)**:
- **Tickets Handled**: Total volume
- **Avg. Response Time**: How quickly they respond
- **Avg. Resolution Time**: How long to close tickets
- **Satisfaction Score**: Customer ratings (if available)

**Workload Distribution**:
- Bar chart showing tickets per agent
- Identifies load imbalance

**Strategic Uses**:
- **Capacity planning**: Who's overloaded? Who has capacity?
- **Performance review**: Data-driven coaching opportunities
- **Training needs**: Identify agents with long resolution times
- **Recognition**: Highlight top performers

---

## How Metrics Are Calculated

### Data Sources

1. **Freshdesk API**: Primary ticket data
   - Synced every time you click "Refresh"
   - Includes all ticket metadata, custom fields, timestamps
   - Filtered to "ARMS Support" product only

2. **Azure DevOps API**: Engineering work items
   - Links tickets to development tasks
   - Shows engineering response to support issues

### Key Calculation Methods

#### Trend Calculations
- **Previous Period**: Automatically calculated as same duration ending just before current period
- **Example**:
  - Current: Jan 15-22 (7 days)
  - Previous: Jan 8-14 (7 days)
- **Percentage Change**: ((Current - Previous) / Previous) × 100

#### Response Time
- **First Response Time**: Time from ticket creation to first public comment by support agent
- **Median Used**: Middle value when sorted, ignores outliers
- **Why Not Average**: One extremely long response time doesn't skew the metric

#### Resolution Time
- **Calculation**: Time from ticket creation to status changed to "Resolved" or "Closed"
- **Excludes**: Time ticket was pending customer response

#### Priority Assignment
- **Source**: Freshdesk priority field (set manually or by automation)
- **Levels**: Urgent (1), High (2), Medium (3), Low (4)

### Date Range Filtering

**All charts and tables respect the selected date range**:
- Created date must fall within range
- Exception: Unresolved tickets show ALL unresolved as of the end date (see Issues Dashboard section)

**Product Filtering**:
- All data is automatically filtered to "ARMS Support" product (ID: 154000020827)
- Excludes tickets from other products in Freshdesk instance

---

## Strategic Use Cases

### Monthly Business Review (MBR)

**Recommended View**: Last 30 Days vs Previous 30 Days

**Key Questions**:
1. **Volume Trends**: Are tickets increasing? At what rate?
   - *Look at*: Tickets Created trend in Platform tab

2. **Efficiency**: Are we resolving tickets faster?
   - *Look at*: Median Response Time and Tickets Resolved trends

3. **Backlog Health**: Is unresolved count growing?
   - *Look at*: Current Unresolved Tickets card

4. **Product Quality**: System Issues trending up or down?
   - *Look at*: Issues tab, System Issues count

5. **Customer Segments**: Which leagues need attention?
   - *Look at*: League tab, sort by volume

### Quarterly Strategic Planning

**Recommended View**: This Quarter vs Last Quarter

**Analysis Points**:
1. **Capacity Planning**:
   - Average daily ticket volume
   - Staff Performance tab → workload distribution
   - *Decision*: Do we need to hire?

2. **Product Roadmap**:
   - Issues tab → System Issues breakdown
   - Types tab → Feature Request volume
   - *Decision*: What should engineering prioritize?

3. **Platform Investment**:
   - Platform tab → which platforms drive most support?
   - Cross-reference with user base size
   - *Decision*: Where to invest development resources?

4. **Process Improvement**:
   - Types tab → High "Question" volume → documentation gaps
   - Hour of Day → coverage gaps
   - *Decision*: Process or training investments needed?

### Crisis Response

**Scenario**: Urgent issue reported affecting multiple customers

**Dashboard Steps**:
1. **Refresh data** (button in top right)
2. **Platform tab** → Check Current Unresolved Tickets (is it spiking?)
3. **Issues tab** → Filter to "System Issues" + "Open"
4. **Sort by Priority** → Identify all Urgent tickets
5. **Click ticket** → View details in modal
6. **Check DevOps link** → See if engineering is engaged
7. **League tab** → Identify affected customer segments
8. **Platform tab** → Identify affected platforms

**Communication Kit**:
- Total affected tickets
- Customer segments impacted
- Platforms affected
- Status (engineering engaged? DevOps ticket?)
- Timeline (when reported, current status)

---

## Best Practices

### Daily Review (5 minutes)
- **Check**: Platform tab KPI cards
- **Focus**: Current Unresolved Tickets (growing?)
- **Action**: If Urgent count > 3, investigate in Issues tab

### Weekly Review (15 minutes)
- **View**: Last 7 Days
- **Tabs to check**:
  1. Platform (trends green or red?)
  2. Issues (System Issues trending up?)
  3. Staff (workload balanced?)
- **Action**: Spot trends early, don't wait for monthly review

### Monthly Deep Dive (45 minutes)
- **View**: Last 30 Days
- **Review all tabs** in order
- **Document**:
  - Key metrics (create dashboard export/screenshot)
  - Trends (up/down/stable)
  - Action items
  - Questions for team

### Quarterly Strategy Session (2 hours)
- **View**: This Quarter
- **Compare**: Last Quarter
- **Prepare**: Year-over-year comparison (enable "Include PY Tickets")
- **Output**: Strategic priorities for next quarter

---

## Understanding Trend Indicators

### Green Arrow Up ↗ (Positive)
**Context Matters**:
- **Tickets Resolved**: MORE tickets resolved (good)
- **Tickets Created**: MORE tickets created (could be good or bad)
  - Good: Growing user base, increased product usage
  - Bad: Quality issues, product problems
- **Response Time**: SLOWER response (bad - but arrow shows increase in time)

### Red Arrow Down ↘ (Negative)
**Context Matters**:
- **Tickets Resolved**: FEWER tickets resolved (bad - decreasing productivity)
- **Tickets Created**: FEWER tickets created (could be good or bad)
  - Good: Improved product quality, better documentation
  - Bad: Decreasing user adoption
- **Response Time**: FASTER response (good - but arrow shows decrease in time)

**Pro Tip**: Don't react to arrows alone. Look at the actual numbers and ask "why?"

---

## Common Questions

### "Why don't the metric cards match the table counts?"

**Answer**: They use different logic intentionally:
- **Metric cards**: Show period-specific activity + current backlog
  - Unresolved: ALL tickets created on or before end date (includes old backlog)
  - Resolved: Only those created within the period
- **Table**: Shows exactly what's visible in filtered view
- **Purpose**: Cards give strategic health, table gives tactical detail

### "Why does Last 7 Days show different numbers than 7 days ago?"

**Answer**: You're looking at different 7-day windows:
- **"Last 7 Days" today**: Past 7 days from today
- **"Last 7 Days" a week ago**: Different 7-day window
- **Trend arrow**: Compares these two different periods

### "Can I export this data?"

**Current State**: Not yet implemented
**Workaround**:
- Take screenshots for reporting
- Data is in Freshdesk - can export from there
**Roadmap**: Export feature planned for future release

### "How often should I refresh?"

**Recommendation**:
- **Real-time monitoring**: Refresh every 15-30 minutes
- **Daily review**: Once in morning
- **Strategic review**: Fresh data before meeting

**Note**: Refresh button pulls latest from Freshdesk API

### "What if I see data that looks wrong?"

**Troubleshooting Steps**:
1. Click Refresh (might be stale data)
2. Check date range selection (correct period?)
3. Check filters (platform filters active?)
4. Verify in Freshdesk directly (source of truth)
5. Contact support team if discrepancy persists

---

## Technical Notes for Executive Understanding

### Why Real-Time Matters
- **Traditional BI**: Reports run overnight, stale by morning
- **This Dashboard**: API-driven, refreshes on demand
- **Benefit**: Make decisions on current state, not yesterday's news

### Data Freshness
- **On Page Load**: Fetches latest data from Freshdesk
- **On Refresh Click**: Re-fetches everything
- **Typical Load Time**: 3-5 seconds for 10,000+ tickets
- **No Manual Data Entry**: Everything automated from source systems

### Reliability
- **Direct API Connection**: No intermediate databases to corrupt
- **Error Handling**: If API fails, dashboard shows error (transparent)
- **Validation**: All calculations performed in browser, reproducible

### Mobile Access
**Current State**: Desktop-optimized
**Mobile**: Functional but better on tablet or desktop
**Recommendation**: Use laptop/desktop for executive review

---

## Appendix: Field Definitions

### Ticket Fields

| Field | Definition | Source |
|-------|-----------|--------|
| **Ticket ID** | Unique Freshdesk ticket number | Freshdesk |
| **Subject** | Ticket title/summary | Freshdesk |
| **Status** | Current ticket state (Open, In Progress, Resolved, etc.) | Freshdesk |
| **Priority** | Urgency level (Urgent, High, Medium, Low) | Freshdesk |
| **Platform** | Where issue occurs (iOS, Android, Web, etc.) | Custom Field |
| **League** | Customer's sports league | Custom Field |
| **Team** | Specific team within league | Custom Field |
| **Issue Type** | System Issue vs User Issue | Custom Field |
| **Ticket Type** | Bug, Feature Request, Question, etc. | Freshdesk |
| **Source** | How ticket was created (Email, Portal, Phone, etc.) | Freshdesk |
| **Created Date** | When ticket was first created | Freshdesk |
| **Updated Date** | Last modification timestamp | Freshdesk |
| **Dev Assistance Needed** | Flag for engineering involvement | Custom Field |
| **DevOps Link** | Link to Azure DevOps work item | Integration |

### Status Definitions

| Status | Meaning | Next Steps |
|--------|---------|-----------|
| **Open** | New, unassigned ticket | Needs triage and assignment |
| **In Progress** | Actively being worked | Support agent investigating |
| **In Backlog** | Queued for future work | Prioritized but not started |
| **Review Response** | Awaiting customer reply | Ball in customer's court |
| **Pending** | Temporarily on hold | External dependency |
| **Awaiting Information** | Need more details | Waiting on customer/3rd party |
| **Waiting on Third Party** | External vendor dependency | Escalated outside ARMS |
| **Resolved** | Fixed and closed | Customer can reopen if needed |
| **Closed** | Permanently closed | Will not reopen |

---

## Support and Feedback

### Getting Help with the Dashboard

**For Questions**:
- Contact: Support Team Lead
- Email: support@arms.com

**For Technical Issues**:
- Contact: IT/DevOps Team
- Include: Screenshot, browser, date/time of issue

**Feature Requests**:
- What would make this more useful?
- What questions can't you answer with current views?
- Email suggestions to product team

---

## Version History

**Version 2.0** - Current
- Added Issues tab with System/User issue classification
- Platform filtering on League and Day of Week dashboards
- Improved date range options (quarters, custom ranges)
- Status color coding for better visual scanning
- Trend indicators on KPI cards
- Priority breakdown card

**Version 1.0** - Initial Release
- Basic ticket analytics
- Platform and League views
- Staff performance tracking

---

## Conclusion

This dashboard transforms raw support data into strategic intelligence. Used consistently, it provides:

1. **Early Warning System**: Spot problems before they become crises
2. **Capacity Planning**: Data-driven hiring and resource decisions
3. **Product Intelligence**: Customer feedback routed to product team
4. **Customer Insights**: Which segments need attention
5. **Team Management**: Fair, objective performance data

**Remember**: Metrics tell you *what* is happening. Your job as an executive is to ask *why* and decide *what to do about it*.

---

*Last Updated: November 2025*
*Document Owner: Product Team*
*Review Cycle: Quarterly*
