/**
 * Generate SOAR Framework Answers API
 * Professional implementation with proper text handling
 */

exports.handler = async (event, context) => {
  // Handle CORS preflight
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
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    // Parse and validate request
    const requestData = JSON.parse(event.body || '{}');
    const { questions, jobDescription, role, experienceLevel, companyName, answerStyle } = requestData;

    console.log('Generate answers request:', {
      questionCount: questions?.length,
      role,
      experienceLevel,
      answerStyle
    });

    // Validate required fields
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Questions array is required and must not be empty',
          received: { hasQuestions: !!questions, isArray: Array.isArray(questions) }
        })
      };
    }

    if (!jobDescription || !role) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Job description and role are required',
          received: { hasJobDescription: !!jobDescription, hasRole: !!role }
        })
      };
    }

    // Limit questions for performance
    if (questions.length > 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Maximum 8 questions allowed per request',
          received: questions.length
        })
      };
    }

    // Define answer style configurations
    const styleConfigurations = {
      confident: {
        tone: "confident and assertive",
        guidance: "Use strong action verbs, showcase achievements prominently, and demonstrate leadership. Quantify results with specific numbers and percentages."
      },
      humble: {
        tone: "humble yet accomplished",
        guidance: "Acknowledge team contributions, show continuous learning mindset, and emphasize collaboration while highlighting personal growth."
      },
      technical: {
        tone: "technical and detailed",
        guidance: "Focus on technical methodologies, specific technologies, and implementation details. Include technical challenges and problem-solving approaches."
      },
      leadership: {
        tone: "leadership-focused and strategic",
        guidance: "Emphasize team management, decision-making, and strategic thinking. Show how you inspire others and drive organizational success."
      }
    };

    const selectedStyle = answerStyle || 'confident';
    const styleConfig = styleConfigurations[selectedStyle] || styleConfigurations.confident;

    // Build comprehensive prompt
    const prompt = `You are an expert career coach specializing in the SOAR interview methodology. Generate professional interview answers for a ${experienceLevel || 'professional'} applying for a ${role} position${companyName ? ` at ${companyName}` : ''}.

Job Context:
${jobDescription}

Answer Style: ${styleConfig.tone}
Style Guidance: ${styleConfig.guidance}

SOAR Framework Guidelines:
- Situation: Brief context setting (20-30 words)
- Obstacles: Challenges or difficulties faced (20-30 words)
- Actions: Specific steps taken to address the situation (80-120 words)
- Results: Quantified outcomes and impact (40-60 words)

For each question, provide THREE response formats:

1. FULL SOAR ANSWER (200-280 words):
   - Complete professional response following SOAR structure
   - Include specific examples and quantified results
   - Demonstrate skills relevant to ${role}
   - Use ${styleConfig.tone} tone throughout

2. CONCISE VERSION (60-80 words):
   - Condensed elevator pitch style
   - Hit all SOAR elements briefly
   - Perfect for follow-up questions

3. KEY TALKING POINTS (exactly 5 bullet points):
   - Essential points to remember
   - Action-oriented statements
   - Include metrics when possible

Requirements:
- Make answers specific to ${role} requirements
- Include industry terminology relevant to the field
- Use quantifiable metrics (percentages, amounts, timeframes)
- Ensure each answer showcases different competencies
- Keep responses realistic and achievable

Questions to answer:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Return ONLY valid JSON in this exact format:
{
  "answers": [
    {
      "question": "original question text",
      "full": "Complete SOAR answer text",
      "concise": "Brief version text",
      "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"]
    }
  ]
}`;

    console.log('Sending request to Claude API...');

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 3000,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    // Check Claude API response
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: 'Claude API error',
          status: response.status,
          details: errorText.substring(0, 200)
        })
      };
    }

    const claudeResponse = await response.json();
    console.log('Claude API response received, length:', claudeResponse.content[0].text.length);

    // Extract and parse JSON response
    const responseText = claudeResponse.content[0].text.trim();

    // Find JSON in response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : responseText;

    let parsedAnswers;
    try {
      parsedAnswers = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError.message);
      console.error('Response preview:', responseText.substring(0, 500));

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to parse Claude response',
          details: parseError.message,
          responsePreview: responseText.substring(0, 300)
        })
      };
    }

    // Validate response structure
    if (!parsedAnswers.answers || !Array.isArray(parsedAnswers.answers)) {
      console.error('Invalid response structure:', Object.keys(parsedAnswers));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Invalid response structure from Claude',
          details: 'Missing answers array',
          received: Object.keys(parsedAnswers)
        })
      };
    }

    // Validate and clean answers
    const validatedAnswers = parsedAnswers.answers.map((answer, index) => {
      const questionText = questions[index] || `Question ${index + 1}`;

      return {
        question: answer.question || questionText,
        full: cleanTextContent(answer.full || 'Answer generation failed for this question.'),
        concise: cleanTextContent(answer.concise || answer.brief || answer.short || 'Brief answer generation failed.'),
        keyPoints: Array.isArray(answer.keyPoints) ?
          answer.keyPoints.map(point => cleanTextContent(point)) :
          Array.isArray(answer.key_points) ?
          answer.key_points.map(point => cleanTextContent(point)) :
          ['Key points generation failed']
      };
    });

    console.log('Successfully generated answers for', validatedAnswers.length, 'questions');

    // Return successful response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        answers: validatedAnswers,
        metadata: {
          style: selectedStyle,
          questionCount: questions.length,
          role: role,
          experienceLevel: experienceLevel,
          companyName: companyName,
          generatedAt: new Date().toISOString(),
          model: 'claude-3-haiku'
        }
      })
    };

  } catch (error) {
    console.error('Generate answers error:', error);
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

/**
 * Clean text content to ensure proper display
 * @param {string} text - Text to clean
 * @returns {string} - Cleaned text
 */
function cleanTextContent(text) {
  if (typeof text !== 'string') {
    return String(text || '');
  }

  return text
    .trim()
    // Remove any control characters that might cause display issues
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Ensure proper sentence spacing
    .replace(/\.\s+/g, '. ')
    // Remove any leftover escape sequences
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\\\/g, '\\')
    .replace(/\\"/g, '"');
}