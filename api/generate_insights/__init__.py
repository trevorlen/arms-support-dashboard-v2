import azure.functions as func
import json
import os
import logging
from anthropic import Anthropic

def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Generate insights function triggered')

    try:
        # Get request body
        req_body = req.get_json()

        # Extract data from request
        aggregated_data = req_body.get('aggregated_data')
        focus_area = req_body.get('focus_area', 'summary')  # summary, trends, performance, priority, predictive, full
        date_range = req_body.get('date_range', {})

        if not aggregated_data:
            return func.HttpResponse(
                json.dumps({"error": "aggregated_data is required"}),
                mimetype="application/json",
                status_code=400
            )

        # Get API key from environment
        api_key = os.environ.get('ANTHROPIC_API_KEY')
        if not api_key:
            return func.HttpResponse(
                json.dumps({"error": "ANTHROPIC_API_KEY not configured"}),
                mimetype="application/json",
                status_code=500
            )

        # Initialize Anthropic client
        client = Anthropic(api_key=api_key)

        # Build system prompt based on focus area
        system_prompt = get_system_prompt(focus_area)

        # Build user message with aggregated data
        user_message = build_user_message(aggregated_data, date_range, focus_area)

        # Call Claude API
        logging.info(f'Calling Claude API for focus area: {focus_area}')
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            temperature=0.7,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": user_message
                }
            ]
        )

        # Extract insights text
        insights_text = message.content[0].text

        # Return response
        return func.HttpResponse(
            json.dumps({
                "insights": insights_text,
                "focus_area": focus_area,
                "date_range": date_range,
                "tokens_used": {
                    "input": message.usage.input_tokens,
                    "output": message.usage.output_tokens
                }
            }),
            mimetype="application/json",
            status_code=200
        )

    except ValueError as e:
        logging.error(f'Invalid request body: {str(e)}')
        return func.HttpResponse(
            json.dumps({"error": "Invalid request body"}),
            mimetype="application/json",
            status_code=400
        )
    except Exception as e:
        logging.error(f'Error generating insights: {str(e)}')
        return func.HttpResponse(
            json.dumps({"error": f"Error generating insights: {str(e)}"}),
            mimetype="application/json",
            status_code=500
        )


def get_system_prompt(focus_area):
    """Get system prompt based on focus area"""

    base_prompt = """You are an executive business analyst specializing in customer support operations.
Your role is to analyze support ticket data and provide clear, actionable insights for C-level executives.

Key guidelines:
- Focus on business impact and strategic implications
- Use clear, concise language appropriate for executives
- Highlight trends, patterns, and anomalies
- Provide specific, actionable recommendations
- Use emojis sparingly to highlight key sections
- Format output in markdown for readability"""

    focus_prompts = {
        'summary': """
Focus on providing a high-level executive summary:
- Overall ticket volume trends
- Key performance indicators
- Most notable insights (2-3 items)
- Immediate action items if any
Keep it brief (3-4 paragraphs).""",

        'trends': """
Focus on identifying trends and patterns:
- Volume trends over time
- Day-of-week patterns
- Platform/league distribution shifts
- Issue type evolution
- Response time trends
Provide forward-looking insights.""",

        'performance': """
Focus on team performance metrics:
- Response time analysis
- Resolution rate assessment
- Workload distribution
- Efficiency opportunities
- Bottleneck identification
Include specific improvement recommendations.""",

        'priority': """
Focus on priority and risk analysis:
- Urgent/High priority ticket trends
- Critical issue identification
- Platform/league risk areas
- Resource allocation recommendations
- Escalation patterns
Highlight areas needing immediate attention.""",

        'predictive': """
Focus on predictive insights and forecasting:
- Projected ticket volumes
- Potential capacity issues
- Seasonal patterns
- Resource planning recommendations
- Proactive measures to consider
Help plan for the future.""",

        'full': """
Provide a comprehensive analysis covering:
1. Executive Summary
2. Volume & Trend Analysis
3. Performance Metrics
4. Priority & Risk Assessment
5. Platform/League Insights
6. Recommendations & Action Items
This should be a detailed report (8-12 paragraphs)."""
    }

    return base_prompt + "\n" + focus_prompts.get(focus_area, focus_prompts['summary'])


def build_user_message(aggregated_data, date_range, focus_area):
    """Build user message with aggregated data"""

    # Format date range
    date_range_str = f"{date_range.get('start_date', 'N/A')} to {date_range.get('end_date', 'N/A')}"

    # Build message
    message = f"""Analyze the following support ticket data for the period: {date_range_str}

**Aggregated Data:**
```json
{json.dumps(aggregated_data, indent=2)}
```

Please provide insights focused on: **{focus_area}**

Note: All personally identifiable information (PII) has been removed from this data."""

    return message
