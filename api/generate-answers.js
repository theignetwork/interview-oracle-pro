exports.handler = async (event, context) => {
  // Only accept POST requests
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
    const { questions, jobDescription, role, experienceLevel, companyName, answerStyle } = JSON.parse(event.body);

    // Validate input
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Questions array is required and must not be empty' })
      };
    }

    if (!jobDescription || !role) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Job description and role are required' })
      };
    }

    // Define answer styles with specific guidance
    const stylePrompts = {
      confident: "Write with confidence and authority. Use strong action verbs, showcase achievements prominently, and demonstrate leadership. Quantify results with specific numbers and percentages.",
      humble: "Write with humility while highlighting accomplishments. Acknowledge team contributions, show continuous learning mindset, and emphasize collaboration and growth.",
      technical: "Focus on technical details, methodologies, and specific technologies. Include technical challenges, problem-solving approaches, and implementation details relevant to the role.",
      leadership: "Emphasize leadership qualities, team management, and strategic thinking. Show how you inspire others, make decisions, handle conflict, and drive organizational success."
    };

    const selectedStyle = answerStyle || 'confident';
    const styleGuidance = stylePrompts[selectedStyle];
    const expLevel = experienceLevel || 'experienced professional';
    const companyText = companyName ? ` at ${companyName}` : '';

    // Build comprehensive prompt for SOAR answers
    const prompt = `You are an expert career coach specializing in the SOAR interview method. Generate comprehensive, professional interview answers for a ${expLevel} applying for a ${role} position${companyText}.

Job Context:
${jobDescription}

Answer Style: ${styleGuidance}

INSTRUCTIONS:
For each question provided, create a detailed answer using the SOAR framework:
- **Situation**: Set the context (20-30 words)
- **Obstacles**: Identify challenges faced (20-30 words)
- **Actions**: Detail specific actions taken (100-150 words)
- **Results**: Quantify outcomes and impact (50-80 words)

For each question, provide THREE versions:

1. **FULL SOAR ANSWER** (200-300 words):
   - Complete professional response following SOAR structure
   - Include specific examples and quantified results
   - Demonstrate skills relevant to the ${role} role
   - Use ${selectedStyle} tone throughout

2. **CONCISE VERSION** (60-80 words):
   - Condensed elevator pitch style
   - Hit all SOAR elements briefly
   - Perfect for quick responses or follow-ups

3. **KEY TALKING POINTS** (5 bullet points):
   - Essential points to remember and emphasize
   - Action-oriented statements with impact
   - Include specific metrics when possible

REQUIREMENTS:
- Make answers specific to ${role} and relevant job requirements
- Include industry terminology and technical concepts
- Use quantifiable metrics (percentages, dollar amounts, timeframes)
- Ensure each answer showcases different competencies
- Maintain consistency with ${selectedStyle} approach
- Make examples realistic and achievable

Questions to answer:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

CRITICAL: You must return COMPLETE, VALID JSON only. Do not truncate responses.

IMPORTANT JSON FORMATTING RULES:
- Escape all quotes in text content (use \\" for quotes inside strings)
- Replace all newlines with \\n
- Escape all backslashes as \\\\
- Do not include unescaped control characters
- Ensure all strings are properly quoted and escaped

Return ONLY valid JSON in this exact format (ensure the JSON is complete and properly closed):
{
  "answers": [
    {
      "question": "original question text",
      "full": "Complete 200-300 word SOAR answer with properly escaped quotes and newlines",
      "concise": "60-80 word condensed answer with escaped characters",
      "keyPoints": [
        "Key talking point 1",
        "Key talking point 2",
        "Key talking point 3",
        "Key talking point 4",
        "Key talking point 5"
      ]
    }
  ]
}

CRITICAL: All text content must have properly escaped quotes (\"), newlines (\\n), and other control characters to create valid JSON.`;

    // Send request to Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // Using Haiku for speed and cost efficiency
        max_tokens: 3000, // Optimized for complete SOAR answers
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
          details: errorText,
          status: response.status
        })
      };
    }

    const apiResponse = await response.json();

    // Parse Claude's response with enhanced validation and escaping
    let parsedContent;
    try {
      const rawResponseText = apiResponse.content[0].text.trim();
      console.log('Raw Claude response length:', rawResponseText.length);
      console.log('Raw Claude response preview:', rawResponseText.substring(0, 200) + '...');

      // Extract JSON from response
      const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
      let jsonString = jsonMatch ? jsonMatch[0] : rawResponseText;

      // Check if response is truncated (doesn't end with closing brace)
      if (!jsonString.endsWith('}')) {
        console.error('Response appears truncated - missing closing brace');
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Incomplete response from Claude',
            details: 'Response was truncated - increase max_tokens or reduce question count',
            responseLength: rawResponseText.length,
            responseEnding: rawResponseText.slice(-100)
          })
        };
      }

      // Properly escape special characters in JSON string values
      function sanitizeJsonString(str) {
        // Find all string values in the JSON and escape them properly
        return str.replace(/"([^"]*(?:\\.[^"]*)*)"/g, (match, content) => {
          // Skip if this is a JSON key (followed by :)
          const nextChar = str[str.indexOf(match) + match.length];
          if (nextChar === ':') {
            return match; // Don't escape JSON keys
          }

          // Escape special characters in string content
          const escapedContent = content
            .replace(/\\/g, '\\\\')    // Escape backslashes first
            .replace(/"/g, '\\"')      // Escape quotes
            .replace(/\n/g, '\\n')     // Escape newlines
            .replace(/\r/g, '\\r')     // Escape carriage returns
            .replace(/\t/g, '\\t')     // Escape tabs
            .replace(/\b/g, '\\b')     // Escape backspaces
            .replace(/\f/g, '\\f')     // Escape form feeds
            .replace(/[\x00-\x1F\x7F]/g, ''); // Remove other control chars

          return `"${escapedContent}"`;
        });
      }

      const sanitizedJsonString = sanitizeJsonString(jsonString);
      console.log('Sanitized JSON length:', sanitizedJsonString.length);

      // Validate JSON before parsing
      try {
        JSON.parse(sanitizedJsonString);
        console.log('JSON validation successful');
      } catch (validationError) {
        console.error('JSON validation failed:', validationError.message);
        console.error('Problematic JSON:', sanitizedJsonString.substring(0, 500));

        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Invalid JSON from Claude',
            details: `JSON validation failed: ${validationError.message}`,
            jsonPreview: sanitizedJsonString.substring(0, 500) + '...'
          })
        };
      }

      // Parse the validated JSON
      parsedContent = JSON.parse(sanitizedJsonString);

      // Validate JSON structure
      if (!parsedContent || typeof parsedContent !== 'object') {
        throw new Error('Parsed content is not a valid object');
      }

    } catch (parseError) {
      console.error('JSON parsing error:', parseError.message);
      console.error('Raw Claude response:', apiResponse.content[0].text);

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to parse Claude response',
          details: `JSON parsing failed: ${parseError.message}`,
          responseLength: apiResponse.content[0].text.length,
          rawResponse: apiResponse.content[0].text.substring(0, 1000) + '...'
        })
      };
    }

    // Validate response structure
    if (!parsedContent.answers || !Array.isArray(parsedContent.answers)) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Invalid response structure from Claude',
          details: 'Missing answers array',
          received: Object.keys(parsedContent)
        })
      };
    }

    // Ensure all answers have required fields and match frontend format
    const validatedAnswers = parsedContent.answers.map((answer, index) => {
      const questionText = questions[index] || `Question ${index + 1}`;

      return {
        question: answer.question || questionText,
        full: answer.full || answer.fullAnswer || 'Answer generation failed for this question.',
        concise: answer.concise || answer.quickVersion || answer.short || 'Answer generation failed.',
        keyPoints: Array.isArray(answer.keyPoints) ? answer.keyPoints :
                  Array.isArray(answer.key_points) ? answer.key_points :
                  ['Unable to generate key points']
      };
    });

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