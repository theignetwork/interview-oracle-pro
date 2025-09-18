exports.handler = async (event, context) => {
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    // Parse request body
    const requestBody = JSON.parse(event.body || '{}');
    const { jobDescription, role, experienceLevel, companyName } = requestBody;

    // Validate input
    if (!jobDescription || !role) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Job description and role are required',
          received: { jobDescription: !!jobDescription, role: !!role }
        })
      };
    }

    if (jobDescription.length < 50) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Job description must be at least 50 characters long',
          length: jobDescription.length
        })
      };
    }

    // Build enhanced prompt for PRO version
    const prompt = `You are an expert career coach and interviewer. Analyze this job description and generate interview questions for a ${experienceLevel || 'professional'} applying for a ${role} position${companyName ? ` at ${companyName}` : ''}.

Job Description:
${jobDescription}

Role Type: ${role}
Experience Level: ${experienceLevel || 'Not specified'}
Company: ${companyName || 'Not specified'}

Generate exactly 12 interview questions for PRO version:
- 6 behavioral questions that assess soft skills, experience, and cultural fit
- 4 technical or role-specific questions that assess hard skills and domain knowledge
- 2 company-specific questions based on the organization and role context

For each question, assign a confidence level using these exact text values:
- "High Probability" for questions that are almost certainly going to be asked
- "Likely" for common questions in this type of role
- "Common in Field" for industry-standard questions

IMPORTANT: Make questions highly specific to the job description provided. Include relevant technologies, responsibilities, and requirements mentioned in the posting.

Format your response as ONLY a valid JSON object with this exact structure:
{
  "behavioral": [
    {"text": "question text", "confidence": "confidence level"},
    {"text": "question text", "confidence": "confidence level"},
    {"text": "question text", "confidence": "confidence level"},
    {"text": "question text", "confidence": "confidence level"},
    {"text": "question text", "confidence": "confidence level"},
    {"text": "question text", "confidence": "confidence level"}
  ],
  "technical": [
    {"text": "question text", "confidence": "confidence level"},
    {"text": "question text", "confidence": "confidence level"},
    {"text": "question text", "confidence": "confidence level"},
    {"text": "question text", "confidence": "confidence level"}
  ],
  "company": [
    {"text": "question text", "confidence": "confidence level"},
    {"text": "question text", "confidence": "confidence level"}
  ]
}

Return ONLY the JSON object, no additional text or formatting.`;

    // Send request to Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    // Check response status
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: 'Claude API error',
          status: response.status,
          details: errorText
        })
      };
    }

    const apiResponse = await response.json();

    // Parse Claude's response
    let parsedContent;
    try {
      const responseText = apiResponse.content[0].text;

      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        parsedContent = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw Claude response:', apiResponse.content[0].text);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to parse Claude response',
          details: 'Response was not valid JSON',
          rawResponse: apiResponse.content[0].text.substring(0, 500) + '...'
        })
      };
    }

    // Validate response structure
    if (!parsedContent.behavioral || !parsedContent.technical || !parsedContent.company) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Invalid response structure',
          details: 'Missing required question categories',
          received: Object.keys(parsedContent)
        })
      };
    }

    // Add confidence icons for display
    const addConfidenceIcons = (questions) => {
      return questions.map(q => ({
        ...q,
        confidence: q.confidence === 'High Probability' ? '⭐ High Probability' :
                   q.confidence === 'Likely' ? '✅ Likely' :
                   q.confidence === 'Common in Field' ? '🔷 Common in Field' :
                   q.confidence
      }));
    };

    const result = {
      behavioral: addConfidenceIcons(parsedContent.behavioral || []),
      technical: addConfidenceIcons(parsedContent.technical || []),
      company: addConfidenceIcons(parsedContent.company || [])
    };

    // Return successful response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Generate questions error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};