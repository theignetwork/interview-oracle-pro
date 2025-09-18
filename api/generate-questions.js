exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
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
    const { jobDescription, role } = JSON.parse(event.body);

    // Validate input
    if (!jobDescription || !role) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Job description and role are required' })
      };
    }

    // Build the prompt for Claude
    const prompt = `You are an expert career coach and interviewer. Analyze this job description and generate interview questions.

Job Description:
${jobDescription}

Role Type: ${role}

Generate exactly 12 interview questions for PRO version:
- 6 behavioral questions that assess soft skills, experience, and cultural fit
- 4 technical or role-specific questions that assess hard skills and domain knowledge
- 2 company-specific questions based on the organization and role context

For each question, assign a confidence level:
- "⭐ High Probability" for questions that are almost certainly going to be asked
- "✅ Likely" for common questions in this type of role
- "🔷 Common in this field" for industry-standard questions

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

Make the questions specific to the job description provided. Focus on the key requirements, responsibilities, and skills mentioned. Return ONLY the JSON object, no additional text.`;

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
        max_tokens: 1000,
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
      console.error('Claude API error:', errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'Claude API error', details: errorText })
      };
    }

    const apiResponse = await response.json();

    // Claude responds with JSON inside a text field
    const parsedContent = JSON.parse(apiResponse.content[0].text);

    // Return just the expected structure
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsedContent)
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
    };
  }
};

