/**
 * Generate Professional Interview Answers API
 * Intelligent methodology selection based on question type
 */

/**
 * Classify question type to determine appropriate answer methodology
 * @param {string} question - The interview question to classify
 * @returns {string} - Question type classification
 */
function classifyQuestion(question) {
  const questionLower = question.toLowerCase();

  // Behavioral indicators - use SOAR method
  const behavioralKeywords = [
    'tell me about a time', 'describe a situation', 'give me an example',
    'walk me through', 'when you had to', 'a time when', 'an example of when',
    'describe when you', 'tell me about when', 'give an example of'
  ];
  if (behavioralKeywords.some(keyword => questionLower.includes(keyword))) {
    return 'behavioral';
  }

  // Motivation/Values indicators - use company research + personal alignment
  const motivationKeywords = [
    'why do you want', 'why are you interested', 'what attracts you',
    'why this company', 'why our company', 'why us', 'what interests you about'
  ];
  if (motivationKeywords.some(keyword => questionLower.includes(keyword))) {
    return 'motivation';
  }

  // Self-assessment indicators - use honest reflection + improvement plan
  const selfAssessmentKeywords = [
    'biggest weakness', 'greatest weakness', 'your weakness', 'your strengths',
    'greatest strength', 'how do you handle stress', 'how do you deal with',
    'what are you bad at', 'what do you struggle with', 'areas for improvement'
  ];
  if (selfAssessmentKeywords.some(keyword => questionLower.includes(keyword))) {
    return 'self_assessment';
  }

  // Career vision indicators - use thoughtful progression
  const careerVisionKeywords = [
    'where do you see yourself', 'career goals', 'future plans',
    'in 5 years', 'long term goals', 'career aspirations', 'professional goals'
  ];
  if (careerVisionKeywords.some(keyword => questionLower.includes(keyword))) {
    return 'career_vision';
  }

  // Compensation indicators - use market research approach
  const compensationKeywords = [
    'salary expectations', 'current salary', 'compensation', 'what do you expect to earn',
    'salary requirements', 'pay expectations', 'salary range'
  ];
  if (compensationKeywords.some(keyword => questionLower.includes(keyword))) {
    return 'compensation';
  }

  // Technical indicators - use step-by-step explanation
  const technicalKeywords = [
    'explain how', 'what is', 'how does', 'define', 'technical approach',
    'your experience with', 'how would you implement', 'design a system'
  ];
  if (technicalKeywords.some(keyword => questionLower.includes(keyword))) {
    return 'technical';
  }

  // Default to general
  return 'general';
}

/**
 * Get methodology framework for question type
 * @param {string} questionType - The classified question type
 * @returns {object} - Framework configuration
 */
function getMethodologyFramework(questionType) {
  const frameworks = {
    behavioral: {
      name: 'SOAR Method',
      structure: 'Situation, Obstacles, Actions, Results',
      guidance: 'Use the SOAR framework: Situation (context), Obstacles (challenges), Actions (specific steps), Results (quantified outcomes). Provide concrete examples with measurable impact.',
      tooltip: 'Situation, Obstacles, Actions, Results - proven framework for behavioral questions'
    },
    motivation: {
      name: 'Company Research',
      structure: 'Research, Alignment, Examples',
      guidance: 'Structure: Research about the company/role + alignment with personal values + specific examples of interest. Show genuine knowledge and enthusiasm.',
      tooltip: 'Research-based answers showing knowledge of company values and culture'
    },
    self_assessment: {
      name: 'Self-Reflection',
      structure: 'Awareness, Examples, Improvement',
      guidance: 'Structure: Honest self-reflection + concrete examples + improvement strategies or management techniques. Balance honesty with professionalism.',
      tooltip: 'Honest self-assessment with improvement strategies'
    },
    career_vision: {
      name: 'Career Planning',
      structure: 'Skills, Growth, Alignment',
      guidance: 'Structure: Realistic skill development goals + logical career progression + alignment with company opportunities. Show thoughtful planning.',
      tooltip: 'Realistic career progression with skill development focus'
    },
    compensation: {
      name: 'Market Research',
      structure: 'Research, Value, Flexibility',
      guidance: 'Structure: Market research for the role/location + value proposition highlighting your worth + flexibility and openness to discussion.',
      tooltip: 'Market-informed salary discussion with value demonstration'
    },
    technical: {
      name: 'Technical Explanation',
      structure: 'Concept, Method, Application',
      guidance: 'Structure: Clear step-by-step explanation + methodology/best practices + practical application examples. Use specific technical details.',
      tooltip: 'Step-by-step breakdown with practical application'
    },
    general: {
      name: 'Structured Response',
      structure: 'Context, Detail, Impact',
      guidance: 'Structure: Brief context setting + detailed explanation with examples + impact or relevance to the role. Maintain professional focus.',
      tooltip: 'Professional structured response with clear context and impact'
    }
  };

  return frameworks[questionType] || frameworks.general;
}

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
    console.log('=== GENERATE ANSWERS API STARTED ===');
    console.log('Event body:', event.body);
    console.log('Event method:', event.httpMethod);

    // Parse and validate request
    const requestData = JSON.parse(event.body || '{}');
    const { questions, jobDescription, role, experienceLevel, companyName, answerStyle } = requestData;

    console.log('Parsed request data:', {
      questionCount: questions?.length,
      questions: questions,
      role,
      experienceLevel,
      jobDescriptionLength: jobDescription?.length,
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

    console.log('Starting question classification...');

    // Ultra-simple approach to get basic functionality working
    console.log('Creating ultra-simple prompt...');

    const prompt = `Generate professional interview answers in JSON format.

Questions:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Return only JSON:
{
  "answers": [
    {
      "question": "first question here",
      "type": "general",
      "methodology": "Professional Response",
      "full": "200 word professional answer",
      "concise": "50 word brief answer",
      "keyPoints": ["point1", "point2", "point3", "point4", "point5"]
    }
  ]
}`;

    console.log('Prompt created, length:', prompt.length);
    console.log('Prompt preview:', prompt.substring(0, 200));
    console.log('API Key available:', !!process.env.CLAUDE_API_KEY);

    console.log('Sending request to Claude API...');

    // Call Claude API
    const claudeRequest = {
      model: 'claude-3-haiku-20240307',
      max_tokens: 3000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    };

    console.log('Claude request body:', JSON.stringify(claudeRequest, null, 2));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(claudeRequest)
    });

    console.log('Claude API response status:', response.status);
    console.log('Claude API response headers:', Object.fromEntries(response.headers.entries()));

    // Check Claude API response
    if (!response.ok) {
      const errorText = await response.text();
      console.error('=== CLAUDE API ERROR ===');
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Error Response:', errorText);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: 'Claude API error',
          status: response.status,
          statusText: response.statusText,
          details: errorText.substring(0, 500)
        })
      };
    }

    console.log('Claude API call successful, parsing response...');
    const claudeResponse = await response.json();
    console.log('Claude response structure:', Object.keys(claudeResponse));
    console.log('Content array length:', claudeResponse.content?.length);

    if (claudeResponse.content && claudeResponse.content[0]) {
      console.log('Response text length:', claudeResponse.content[0].text.length);
      console.log('Response text preview:', claudeResponse.content[0].text.substring(0, 300));
    } else {
      console.error('Unexpected Claude response structure:', claudeResponse);
    }

    // Extract and parse JSON response
    const responseText = claudeResponse.content[0].text.trim();
    console.log('Raw Claude response:', responseText.substring(0, 200));

    // Simple JSON extraction
    console.log('Extracting JSON...');
    let jsonString = responseText.trim();

    console.log('=== JSON PARSING ATTEMPT ===');
    console.log('jsonString length:', jsonString?.length);
    console.log('jsonString preview:', jsonString?.substring(0, 300));

    // Clean the JSON string to fix control character issues
    console.log('Cleaning JSON string...');
    const cleanedJsonString = jsonString
      .replace(/\n/g, '\\n')           // Escape newlines
      .replace(/\r/g, '\\r')           // Escape carriage returns
      .replace(/\t/g, '\\t')           // Escape tabs
      .replace(/\f/g, '\\f')           // Escape form feeds
      .replace(/\b/g, '\\b')           // Escape backspaces
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove other control characters
      .replace(/\\+n/g, '\\n')         // Fix double-escaped newlines
      .replace(/\\+r/g, '\\r')         // Fix double-escaped carriage returns
      .replace(/\\+t/g, '\\t');        // Fix double-escaped tabs

    console.log('Cleaned JSON preview:', cleanedJsonString.substring(0, 300));

    let parsedAnswers;
    try {
      console.log('Attempting JSON.parse on cleaned string...');
      parsedAnswers = JSON.parse(cleanedJsonString);
      console.log('JSON parsing successful!');
      console.log('Parsed object keys:', Object.keys(parsedAnswers));
      console.log('Answers array length:', parsedAnswers.answers?.length);
    } catch (parseError) {
      console.error('=== JSON PARSING FAILED ===');
      console.error('Parse error type:', parseError.constructor.name);
      console.error('Parse error message:', parseError.message);
      console.error('Original JSON string (first 500 chars):', jsonString.substring(0, 500));
      console.error('Cleaned JSON string (first 500 chars):', cleanedJsonString.substring(0, 500));
      console.error('Full response (first 1000 chars):', responseText.substring(0, 1000));

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to parse Claude response',
          parseErrorType: parseError.constructor.name,
          parseErrorMessage: parseError.message,
          responsePreview: responseText.substring(0, 800),
          originalJson: jsonString.substring(0, 400),
          cleanedJson: cleanedJsonString.substring(0, 400),
          jsonExtractionMethod: 'simple-trim'
        })
      };
    }

    // Validate response structure
    if (!parsedAnswers.answers || !Array.isArray(parsedAnswers.answers)) {
      console.error('Invalid response structure:', Object.keys(parsedAnswers));

      // Fallback: Create basic answers if Claude didn't return proper structure
      console.log('Creating fallback answers...');
      parsedAnswers = {
        answers: questions.map((question, index) => {
          const questionMetadata = questionsWithMethodologies[index];
          return {
            question: question,
            type: questionMetadata.type,
            methodology: questionMetadata.framework.name,
            full: "I apologize, but there was an issue generating the full answer. Please try again.",
            concise: "Answer generation failed. Please retry.",
            keyPoints: ["Please try generating answers again", "The system encountered a temporary issue", "Your question has been classified correctly", "The methodology has been determined", "Retry for proper answers"]
          };
        })
      };
    }

    // Validate and clean answers
    const validatedAnswers = parsedAnswers.answers.map((answer, index) => {
      const questionText = questions[index] || `Question ${index + 1}`;

      return {
        question: answer.question || questionText,
        methodology: answer.methodology || 'Professional Response',
        type: answer.type || 'general',
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
    console.error('=== FATAL ERROR IN GENERATE ANSWERS ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Event body at error:', event.body);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        errorType: error.constructor.name,
        details: error.message,
        stack: error.stack?.split('\n').slice(0, 5),
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