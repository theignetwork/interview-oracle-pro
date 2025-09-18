exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-ID',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const userId = event.headers['x-user-id'] || 'anonymous';
    const sessionId = event.queryStringParameters?.sessionId;

    switch (event.httpMethod) {
      case 'GET':
        return await getSessions(userId, sessionId, headers);

      case 'POST':
        return await saveSession(event.body, userId, headers);

      case 'PUT':
        return await updateSession(event.body, sessionId, userId, headers);

      case 'DELETE':
        return await deleteSession(sessionId, userId, headers);

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

  } catch (error) {
    console.error('Session management error:', error);
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

async function getSessions(userId, sessionId, headers) {
  // In a real implementation, this would connect to a database
  // For now, we'll simulate with localStorage-like functionality

  if (sessionId) {
    // Get specific session
    const session = getSessionFromStorage(userId, sessionId);
    if (!session) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Session not found' })
      };
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ session })
    };
  }

  // Get all sessions for user
  const sessions = getAllSessionsFromStorage(userId);
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      sessions: sessions,
      count: sessions.length
    })
  };
}

async function saveSession(bodyData, userId, headers) {
  if (!bodyData) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Request body is required' })
    };
  }

  const sessionData = JSON.parse(bodyData);

  // Validate required fields
  const requiredFields = ['title', 'questions', 'jobDescription', 'role'];
  for (const field of requiredFields) {
    if (!sessionData[field]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `${field} is required` })
      };
    }
  }

  // Create session object
  const session = {
    id: generateSessionId(),
    userId: userId,
    title: sessionData.title,
    jobDescription: sessionData.jobDescription,
    role: sessionData.role,
    experienceLevel: sessionData.experienceLevel || 'Mid Level',
    companyName: sessionData.companyName || '',
    questions: sessionData.questions || [],
    answers: sessionData.answers || [],
    metadata: {
      questionCount: (sessionData.questions || []).length,
      answerCount: (sessionData.answers || []).length,
      hasAnswers: (sessionData.answers || []).length > 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0'
    },
    stats: {
      timesViewed: 0,
      lastViewed: null
    }
  };

  // Save to storage (in real implementation, this would be a database)
  saveSessionToStorage(userId, session);

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      message: 'Session saved successfully',
      sessionId: session.id,
      session: session
    })
  };
}

async function updateSession(bodyData, sessionId, userId, headers) {
  if (!sessionId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Session ID is required' })
    };
  }

  if (!bodyData) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Request body is required' })
    };
  }

  const updateData = JSON.parse(bodyData);
  const existingSession = getSessionFromStorage(userId, sessionId);

  if (!existingSession) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Session not found' })
    };
  }

  // Update session
  const updatedSession = {
    ...existingSession,
    ...updateData,
    metadata: {
      ...existingSession.metadata,
      ...updateData.metadata,
      updatedAt: new Date().toISOString()
    },
    stats: {
      ...existingSession.stats,
      ...updateData.stats
    }
  };

  // Recalculate counts if questions or answers were updated
  if (updateData.questions) {
    updatedSession.metadata.questionCount = updateData.questions.length;
  }
  if (updateData.answers) {
    updatedSession.metadata.answerCount = updateData.answers.length;
    updatedSession.metadata.hasAnswers = updateData.answers.length > 0;
  }

  saveSessionToStorage(userId, updatedSession);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Session updated successfully',
      session: updatedSession
    })
  };
}

async function deleteSession(sessionId, userId, headers) {
  if (!sessionId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Session ID is required' })
    };
  }

  const session = getSessionFromStorage(userId, sessionId);
  if (!session) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Session not found' })
    };
  }

  deleteSessionFromStorage(userId, sessionId);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Session deleted successfully',
      sessionId: sessionId
    })
  };
}

// Storage utility functions
// In a real implementation, these would connect to a database like MongoDB, PostgreSQL, etc.

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getStorageKey(userId) {
  return `interview_oracle_sessions_${userId}`;
}

function saveSessionToStorage(userId, session) {
  // Simulate saving to a persistent storage
  // In real implementation, this would save to a database
  const key = getStorageKey(userId);

  // Get existing sessions
  const existingSessions = getAllSessionsFromStorage(userId);

  // Find index of existing session or add new one
  const existingIndex = existingSessions.findIndex(s => s.id === session.id);

  if (existingIndex >= 0) {
    existingSessions[existingIndex] = session;
  } else {
    existingSessions.push(session);
  }

  // In a real implementation, you would save this to your database
  // For now, we'll just simulate the operation
  console.log(`Saving session ${session.id} for user ${userId}`);

  return session;
}

function getSessionFromStorage(userId, sessionId) {
  // In real implementation, query database for specific session
  const sessions = getAllSessionsFromStorage(userId);
  return sessions.find(session => session.id === sessionId) || null;
}

function getAllSessionsFromStorage(userId) {
  // In real implementation, query database for all user sessions
  // For now, return a mock response that would come from client-side localStorage

  // This would typically be retrieved from a database
  // Sample sessions for demonstration
  const mockSessions = [
    {
      id: 'session_' + Date.now() + '_demo1',
      userId: userId,
      title: 'Software Engineer at Google',
      jobDescription: 'Full-stack software engineer role...',
      role: 'Software Engineering',
      experienceLevel: 'Senior Level',
      companyName: 'Google',
      questions: [
        'Tell me about a time you solved a complex technical problem.',
        'How do you handle code reviews?',
        'Describe your experience with system design.',
        'How do you stay updated with new technologies?'
      ],
      answers: [],
      metadata: {
        questionCount: 4,
        answerCount: 0,
        hasAnswers: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        version: '1.0'
      },
      stats: {
        timesViewed: 3,
        lastViewed: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      }
    }
  ];

  return mockSessions;
}

function deleteSessionFromStorage(userId, sessionId) {
  // In real implementation, delete from database
  console.log(`Deleting session ${sessionId} for user ${userId}`);
  return true;
}