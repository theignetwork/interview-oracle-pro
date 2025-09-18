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
    const { questions, jobDescription, role, experienceLevel, companyName, answerStyle } = JSON.parse(event.body);

    // Validate input
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Questions array is required' })
      };
    }

    if (!jobDescription || !role) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Job description and role are required' })
      };
    }

    // Define answer styles
    const stylePrompts = {
      confident: "Write with confidence and authority, showcasing achievements and capabilities. Use strong action verbs and quantifiable results.",
      humble: "Write with humility while still highlighting accomplishments. Acknowledge team contributions and show continuous learning mindset.",
      technical: "Focus on technical details, methodologies, and specific technologies used. Include technical challenges and solutions.",
      leadership: "Emphasize leadership qualities, team management, decision-making, and strategic thinking. Show how you inspire and guide others."
    };

    const selectedStyle = answerStyle || 'confident';
    const styleGuidance = stylePrompts[selectedStyle];

    // Build the comprehensive prompt for SOAR answers
    const prompt = `You are an expert career coach specializing in the SOAR method (Situation, Obstacles, Actions, Results). Generate comprehensive interview answers for a ${experienceLevel || 'professional'} applying for a ${role} position${companyName ? ` at ${companyName}` : ''}.

Job Context:
${jobDescription}

Answer Style: ${styleGuidance}

For each question provided, create a detailed SOAR answer with the following structure:

**SOAR Framework:**
- **Situation**: Set the context (1-2 sentences)
- **Obstacles**: Identify challenges faced (1-2 sentences)
- **Actions**: Detail specific actions taken (3-4 sentences)
- **Results**: Quantify outcomes and impact (2-3 sentences)

**Answer Variations:**
Create 3 versions for each question:
1. **Full Answer (2-3 minutes)**: 250-300 words, comprehensive SOAR structure
2. **Concise Answer (30-60 seconds)**: 80-120 words, abbreviated SOAR
3. **Key Points**: 3-5 bullet points highlighting the most important elements

**Requirements:**
- Make answers specific to the ${role} role and job requirements
- Include relevant industry terminology and concepts
- Use quantifiable metrics where appropriate (percentages, numbers, timeframes)
- Ensure answers demonstrate skills mentioned in the job description
- Maintain the ${selectedStyle} tone throughout
- Make each answer unique and authentic-sounding

Questions to answer:
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Format your response as a JSON object with this exact structure:
{
  "answers": [
    {
      "question": "original question text",
      "full": "250-300 word comprehensive SOAR answer",
      "concise": "80-120 word abbreviated answer",
      "keyPoints": ["bullet point 1", "bullet point 2", "bullet point 3", "bullet point 4", "bullet point 5"]
    }
  ]
}

Generate professional, specific answers that would impress hiring managers for this ${role} position. Focus on demonstrating value, problem-solving abilities, and results achievement.`;

    // Send request to Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229', // Using Sonnet for better quality answers
        max_tokens: 4000,
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

    // Parse Claude's response
    let parsedContent;
    try {
      parsedContent = JSON.parse(apiResponse.content[0].text);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw response:', apiResponse.content[0].text);

      // Attempt to extract JSON from response if it's wrapped in other text
      const jsonMatch = apiResponse.content[0].text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedContent = JSON.parse(jsonMatch[0]);
        } catch (secondParseError) {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              error: 'Failed to parse Claude response',
              details: 'Response was not valid JSON',
              rawResponse: apiResponse.content[0].text
            })
          };
        }
      } else {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'No JSON found in Claude response',
            rawResponse: apiResponse.content[0].text
          })
        };
      }
    }

    // Validate the parsed response structure
    if (!parsedContent.answers || !Array.isArray(parsedContent.answers)) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Invalid response structure',
          details: 'Missing answers array'
        })
      };
    }

    // Ensure all answers have required fields
    const validatedAnswers = parsedContent.answers.map((answer, index) => {
      if (!answer.question || !answer.full || !answer.concise || !answer.keyPoints) {
        console.error(`Answer ${index} missing required fields:`, answer);
        return {
          question: questions[index] || `Question ${index + 1}`,
          full: answer.full || 'Answer generation failed for this question.',
          concise: answer.concise || 'Answer generation failed.',
          keyPoints: answer.keyPoints || ['Answer generation failed']
        };
      }
      return answer;
    });

    // Return the validated answers
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
          generatedAt: new Date().toISOString()
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